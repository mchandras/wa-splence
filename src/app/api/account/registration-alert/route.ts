import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sendTextMessage, sendTemplateMessage } from '@/lib/whatsapp/meta-api';
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fullName, email } = body as { fullName?: string; email?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const targetPhone = sanitizePhoneForMeta(
      process.env.ADMIN_ALERT_PHONE_NUMBER || '+918123322871'
    );

    const formattedTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const messageText = [
      '🔔 *New Account Registration!*',
      `*Name:* ${fullName || 'Not provided'}`,
      `*Email:* ${email}`,
      `*Time:* ${formattedTime}`,
      `*Status:* Pending Verification`,
      '',
      'A new user has registered and is awaiting offline payment verification. You can verify payment and activate their account under Admin Panel (/admin).',
    ].join('\n');

    const adminClient = supabaseAdmin();
    const { data: config, error: configErr } = await adminClient
      .from('whatsapp_config')
      .select('phone_number_id, access_token, account_id, user_id')
      .eq('status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configErr || !config?.phone_number_id || !config?.access_token) {
      console.warn(
        '[registration-alert] No connected WhatsApp configuration found to dispatch alert to',
        targetPhone,
        configErr
      );
      return NextResponse.json({
        ok: false,
        error: 'No active WhatsApp configuration found',
      }, { status: 503 });
    }

    const accessToken = decrypt(config.access_token);
    let messageId: string | null = null;
    let sendError: unknown = null;

    // 1. Try sending as standard text message (works inside 24h window)
    try {
      const res = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: targetPhone,
        text: messageText,
      });
      messageId = res.messageId;
      console.log(`[registration-alert] WhatsApp text message sent to ${targetPhone} (wamid: ${messageId})`);
    } catch (txtErr) {
      sendError = txtErr;
      console.warn('[registration-alert] Text message delivery failed, trying fallback/template:', txtErr);

      // 2. Try template fallback in case outside 24h window
      try {
        const tRes = await sendTemplateMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to: targetPhone,
          templateName: 'account_registration_alert',
          language: 'en_US',
          params: [fullName || 'New User', email, formattedTime],
        });
        messageId = tRes.messageId;
        console.log(`[registration-alert] WhatsApp template sent to ${targetPhone} (wamid: ${messageId})`);
      } catch (tplErr) {
        console.warn('[registration-alert] Template fallback failed:', tplErr);
      }
    }

    if (!messageId) {
      console.error('[registration-alert] Failed to deliver WhatsApp alert:', sendError);
      return NextResponse.json({
        ok: false,
        error: sendError instanceof Error ? sendError.message : 'Failed to send WhatsApp alert',
      }, { status: 502 });
    }

    // 3. Persist the alert in the database under the owner's conversation
    // so it shows in WACRM inbox and tracks webhook delivery status (delivered/read).
    try {
      // Find contact for targetPhone
      const { data: contacts } = await adminClient
        .from('contacts')
        .select('id, user_id, account_id')
        .eq('account_id', config.account_id)
        .ilike('phone', `%${targetPhone.slice(-10)}%`)
        .limit(1);

      const contact = contacts?.[0];
      if (contact) {
        // Find or create conversation
        let { data: conv } = await adminClient
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .limit(1)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await adminClient
            .from('conversations')
            .insert({
              account_id: config.account_id,
              user_id: contact.user_id || config.user_id,
              contact_id: contact.id,
              status: 'open',
              last_message_text: messageText,
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          conv = newConv;
        }

        if (conv?.id) {
          await adminClient.from('messages').insert({
            conversation_id: conv.id,
            sender_type: 'agent',
            content_type: 'text',
            content_text: messageText,
            message_id: messageId,
            status: 'sent',
          });

          await adminClient
            .from('conversations')
            .update({
              last_message_text: messageText,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conv.id);
        }
      }
    } catch (dbErr) {
      console.warn('[registration-alert] Non-blocking DB message recording failed:', dbErr);
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    console.error('[registration-alert] Error processing alert:', err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Internal Server Error',
    }, { status: 500 });
  }
}
