import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { NextResponse, type NextRequest } from 'next/server';

interface AccountRow {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  activated_at: string | null;
  owner_user_id: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string;
}

export async function GET(request: NextRequest) {
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

  // Caller must be an owner or admin of their account
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('account_role')
    .eq('user_id', user.id)
    .single();

  if (
    callerProfile?.account_role !== 'owner' &&
    callerProfile?.account_role !== 'admin'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = supabaseAdmin();

  // Fetch all accounts with their owner profiles using supabaseAdmin
  const { data: rawAccounts, error } = await adminClient
    .from('accounts')
    .select(`
      id,
      name,
      status,
      created_at,
      activated_at,
      owner_user_id
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = (rawAccounts || []) as AccountRow[];

  // Enrich with owner email and name from profiles
  const ownerIds = accounts.map((a) => a.owner_user_id).filter(Boolean);
  const { data: rawProfiles } = await adminClient
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', ownerIds);

  const profiles = (rawProfiles || []) as ProfileRow[];
  const profileMap = new Map<string, ProfileRow>(
    profiles.map((p) => [p.user_id, p])
  );

  const enriched = accounts.map((a) => {
    const p = profileMap.get(a.owner_user_id);
    return {
      id: a.id,
      name: a.name,
      status: a.status || 'pending',
      created_at: a.created_at,
      activated_at: a.activated_at,
      owner_name: p?.full_name || a.name,
      owner_email: p?.email || '',
    };
  });

  return NextResponse.json({ accounts: enriched });
}
