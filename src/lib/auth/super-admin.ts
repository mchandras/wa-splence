/**
 * Super Admin authorization helper.
 *
 * Super Admins are platform-level operators who can access the global
 * Admin Panel (/admin), view all tenant accounts, activate registrations,
 * and manage platform-wide operations. Regular tenant owners / admins
 * only have access to their own account.
 */

const DEFAULT_SUPER_ADMINS = [
  'manojcdigital@gmail.com',
  'manojkchandar@gmail.com',
];

export function getSuperAdminEmails(): Set<string> {
  const envEmails = (
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ||
    process.env.SUPER_ADMIN_EMAILS ||
    ''
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set([
    ...DEFAULT_SUPER_ADMINS.map((e) => e.toLowerCase()),
    ...envEmails,
  ]);
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getSuperAdminEmails().has(normalized);
}
