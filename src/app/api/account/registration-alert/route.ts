import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
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
      'A new user has registered and is awaiting offline payment verification. You can verify payment and activate their account under Settings → Account Approvals.',
    ].join('\n');

    // Attempt WhatsApp delivery via the connected WhatsApp configuration
    try {
      const adminClient = supabaseAdmin();
      const { data: config } = await adminClient
        .from('whatsapp_config')
        .select('phone_number_id, access_token')
        .eq('status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config?.phone_number_id && config?.access_token) {
        const accessToken = decrypt(config.access_token);
        await sendTextMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to: targetPhone,
          text: messageText,
        });
        console.log(`[registration-alert] WhatsApp alert sent to ${targetPhone} for ${email}`);
      } else {
        console.log(`[registration-alert] No active WhatsApp config found to dispatch alert to ${targetPhone}`);
      }
    } catch (waErr) {
      console.warn('[registration-alert] WhatsApp delivery failed (non-blocking):', waErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[registration-alert] Error processing alert:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
