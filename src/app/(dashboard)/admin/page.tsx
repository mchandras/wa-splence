'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { isSuperAdminEmail } from '@/lib/auth/super-admin';
import { ApprovalsPanel } from '@/components/settings/approvals-panel';

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, profileLoading } = useAuth();
  const isSuperAdmin = isSuperAdminEmail(user?.email || profile?.email);

  useEffect(() => {
    if (!profileLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [profileLoading, isSuperAdmin, router]);

  if (profileLoading || !isSuperAdmin) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage system accounts, review registrations, and activate offline payments.
          </p>
        </div>

        <ApprovalsPanel />
      </div>
    </Suspense>
  );
}
