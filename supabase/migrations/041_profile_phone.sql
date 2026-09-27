-- ============================================================
-- 041_profile_phone
--
-- Adds contact phone number column to public.profiles.
-- Updates handle_new_user() trigger to save user contact phone from
-- signup metadata into profiles.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Add phone column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Backfill profiles.phone from auth.users raw_user_meta_data if present
UPDATE public.profiles p
SET phone = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.phone IS NULL OR p.phone = '')
  AND u.raw_user_meta_data->>'phone' IS NOT NULL;

-- 3. Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Create fresh account with 'pending' status awaiting manual verification
  INSERT INTO public.accounts (name, owner_user_id, status)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'), NEW.id, 'pending')
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, phone, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, NULLIF(v_phone, ''), v_account_id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
