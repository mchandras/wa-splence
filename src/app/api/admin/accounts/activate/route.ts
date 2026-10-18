import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { NextResponse, type NextRequest } from 'next/server';
import { isSuperAdminEmail } from '@/lib/auth/super-admin';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Platform Super Admins can activate or suspend accounts
  if (!isSuperAdminEmail(user.email)) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin only' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { accountId, action } = body as {
    accountId?: string;
    action?: 'activate' | 'suspend';
  };

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const newStatus = action === 'suspend' ? 'suspended' : 'active';
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'active') {
    updateData.activated_at = new Date().toISOString();
  }

  const adminClient = supabaseAdmin();
  const { error } = await adminClient
    .from('accounts')
    .update(updateData)
    .eq('id', accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
