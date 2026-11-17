-- "Complete your profile": what the user wants help with (pay off debt,
-- retirement, ...). profile_prompted_at null = the prompt still shows on
-- their next visit (new and existing users alike); saving or skipping sets
-- it. priorities ids are validated in lib/actions/profile.ts against
-- PRIORITIES (lib/learn-modules.ts) — no check constraint, so adding a
-- priority doesn't need a migration. user_settings already has RLS + the
-- aal2 policy (0018, 0024).
alter table public.user_settings
  add column priorities text[] not null default '{}',
  add column profile_prompted_at timestamptz;
