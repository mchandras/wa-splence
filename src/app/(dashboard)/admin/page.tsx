'use client';

import { Suspense } from 'react';
import { ApprovalsPanel } from '@/components/settings/approvals-panel';

export default function AdminPage() {
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
