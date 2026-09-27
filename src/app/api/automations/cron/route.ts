import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { resumePendingExecution } from '@/lib/automations/engine'
import type { AutomationContext } from '@/lib/automations/engine'
import { createClient } from '@/lib/supabase/server'

/**
 * Drain due `automation_pending_executions` rows.
 * Executed by:
 * 1. Cron scheduler (Vercel Cron / external pinger / Supabase pg_cron)
 * 2. Background drain from WhatsApp webhook after inbound events
 * 3. Authenticated CRM dashboard periodic poll or manual trigger
 */
export async function drainDueAutomations(): Promise<{ processed: number; errors: number }> {
  if (process.env.NODE_ENV === 'test') return { processed: 0, errors: 0 }
  const admin = supabaseAdmin()
  const { data: due, error } = await admin
    .from('automation_pending_executions')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('run_at', { ascending: true })
    .limit(50)

  if (error || !due || due.length === 0) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0
  for (const row of due) {
    const { data: claim } = await admin
      .from('automation_pending_executions')
      .update({ status: 'running' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!claim) continue

    try {
      await resumePendingExecution({
        id: row.id as string,
        automation_id: row.automation_id as string,
        account_id: row.account_id as string,
        user_id: row.user_id as string,
        contact_id: (row.contact_id as string | null) ?? null,
        log_id: (row.log_id as string | null) ?? null,
        parent_step_id: (row.parent_step_id as string | null) ?? null,
        branch: (row.branch as 'yes' | 'no' | null) ?? null,
        next_step_position: row.next_step_position as number,
        context: (row.context as AutomationContext) ?? {},
      })
      processed++
    } catch (err) {
      console.error('[automations] resume failed for row', row.id, err)
      errors++
    }
  }

  return { processed, errors }
}

function verifySecret(supplied: string, expected: string): boolean {
  if (!supplied || !expected) return false
  const suppliedBuf = Buffer.from(supplied)
  const expectedBuf = Buffer.from(expected)
  if (suppliedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(suppliedBuf, expectedBuf)
}

async function isRequestAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET

  // 1. Direct header x-cron-secret
  if (cronSecret) {
    const xSecret = request.headers.get('x-cron-secret')
    if (xSecret && verifySecret(xSecret, cronSecret)) return true

    // 2. Authorization: Bearer <secret> (standard for Vercel Cron and curl)
    const auth = request.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7).trim()
      if (verifySecret(token, cronSecret)) return true
      if (process.env.CRON_SECRET && verifySecret(token, process.env.CRON_SECRET)) return true
    }
  }

  // 3. Authenticated CRM user session (admin / agent)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return true
  } catch {
    // Ignore and fail closed below
  }

  return false
}

export async function GET(request: Request) {
  const authorized = await isRequestAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainDueAutomations()
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const authorized = await isRequestAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainDueAutomations()
  return NextResponse.json(result)
}
