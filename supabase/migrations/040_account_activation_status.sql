-- ============================================================
-- 040_account_activation_status
--
-- Restricts self-serve registration until manual offline payment
-- verification. New signups receive status = 'pending'.
-- Tool owner verifies offline payment and activates the account.
--
-- Backfills all existing accounts to status = 'active' so no
-- existing workspace or user is interrupted.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Add status and activated_at columns to accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'active', 'suspended')),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);

-- 2. Backfill existing accounts: ensure all existing accounts are 'active'
UPDATE public.accounts
SET status = 'active',
    activated_at = COALESCE(activated_at, created_at)
WHERE status IS NULL OR status = 'pending';

-- 3. Replace handle_new_user() trigger function
-- New registrations default to status = 'pending'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Create fresh account with 'pending' status awaiting manual verification
  INSERT INTO public.accounts (name, owner_user_id, status)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'), NEW.id, 'pending')
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
