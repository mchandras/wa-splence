import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSuperAdminEmail, getSuperAdminEmails } from './super-admin';

describe('super-admin helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('recognizes default super admin emails regardless of casing', () => {
    expect(isSuperAdminEmail('manojcdigital@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('MANOJCDIGITAL@GMAIL.COM')).toBe(true);
    expect(isSuperAdminEmail('manojkchandar@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('  manojkchandar@gmail.com  ')).toBe(true);
    expect(getSuperAdminEmails()).toContain('manojcdigital@gmail.com');
  });

  it('rejects regular client emails', () => {
    expect(isSuperAdminEmail('sankar@campaignrider.net')).toBe(false);
    expect(isSuperAdminEmail('client@example.com')).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
    expect(isSuperAdminEmail('')).toBe(false);
  });

  it('respects SUPER_ADMIN_EMAILS environment variable', () => {
    process.env.SUPER_ADMIN_EMAILS = 'partner@company.com, admin@splence.in';
    expect(isSuperAdminEmail('partner@company.com')).toBe(true);
    expect(isSuperAdminEmail('admin@splence.in')).toBe(true);
    expect(isSuperAdminEmail('other@company.com')).toBe(false);
  });
});
