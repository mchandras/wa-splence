'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface AccountRecord {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  activated_at: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
}

export function ApprovalsPanel() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all' | 'active'>('pending');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/accounts');
      if (!res.ok) {
        throw new Error('Failed to load accounts');
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not fetch accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleUpdateStatus = async (
    accountId: string,
    action: 'activate' | 'suspend',
    accountName: string
  ) => {
    setActionLoadingId(accountId);
    try {
      const res = await fetch('/api/admin/accounts/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Action failed');
      }

      const newStatus = action === 'suspend' ? 'suspended' : 'active';
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId
            ? {
                ...acc,
                status: newStatus,
                activated_at:
                  action === 'activate' ? new Date().toISOString() : acc.activated_at,
              }
            : acc
        )
      );

      if (action === 'activate') {
        toast.success(`Account for "${accountName}" activated! They can now sign in.`);
      } else {
        toast.success(`Account for "${accountName}" has been suspended.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update account';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = useMemo(
    () => accounts.filter((a) => a.status === 'pending').length,
    [accounts]
  );
  const activeCount = useMemo(
    () => accounts.filter((a) => a.status === 'active').length,
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesFilter =
        filter === 'all' ? true : acc.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        acc.owner_name.toLowerCase().includes(q) ||
        acc.owner_email.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [accounts, filter, search]);

  return (
    <div className="space-y-6">
      {/* Top summary banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Account Approvals
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verify offline payments and activate accounts for new registrations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAccounts}
          disabled={loading}
          className="border-border text-foreground hover:bg-muted"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Pending Verification
              </p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Active Accounts
              </p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {activeCount}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Registrations
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {accounts.length}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-primary text-primary-foreground' : ''}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className={filter === 'active' ? 'bg-primary text-primary-foreground' : ''}
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
          >
            All ({accounts.length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-border text-sm"
          />
        </div>
      </div>

      {/* Accounts list table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="rounded-full bg-muted p-3 mb-2">
                <CheckCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground">
                No accounts found
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {filter === 'pending'
                  ? 'All user registrations have been verified and activated!'
                  : 'No accounts match the current filter or search criteria.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAccounts.map((account) => {
                const isActionLoading = actionLoadingId === account.id;
                const isPending = account.status === 'pending';
                const isSuspended = account.status === 'suspended';

                return (
                  <div
                    key={account.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {account.owner_name || account.name}
                        </span>
                        {isPending && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-medium"
                          >
                            Pending Verification
                          </Badge>
                        )}
                        {account.status === 'active' && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-medium"
                          >
                            Active
                          </Badge>
                        )}
                        {isSuspended && (
                          <Badge
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium"
                          >
                            Suspended
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{account.owner_email}</span>
                        {account.owner_phone ? (
                          <>
                            <span>•</span>
                            <a
                              href={`https://wa.me/${account.owner_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-medium hover:underline"
                              title="Message on WhatsApp"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>{account.owner_phone}</span>
                            </a>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>
                          Registered:{' '}
                          {new Date(account.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {account.activated_at && (
                          <>
                            <span>•</span>
                            <span>
                              Activated:{' '}
                              {new Date(account.activated_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {isPending ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              account.id,
                              'activate',
                              account.owner_name || account.name
                            )
                          }
                          disabled={isActionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        >
                          {isActionLoading ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1.5 h-4 w-4" />
                          )}
                          Verify & Activate
                        </Button>
                      ) : account.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(
                              account.id,
                              'suspend',
                              account.owner_name || account.name
                            )
                          }
                          disabled={isActionLoading}
                          className="border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs"
                        >
                          {isActionLoading ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                          )}
                          Suspend Access
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(
                              account.id,
                              'activate',
                              account.owner_name || account.name
                            )
                          }
                          disabled={isActionLoading}
                          className="border-border text-emerald-500 hover:bg-emerald-500/10 text-xs"
                        >
                          {isActionLoading ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          Re-activate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
