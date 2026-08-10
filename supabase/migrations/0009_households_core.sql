-- Household schema: households/household_members/household_invites/
-- household_links. A household is the new ownership unit for accounts and
-- transactions (0011), replacing per-user_id ownership. Every user gets
-- exactly one household (enforced below), created automatically at signup
-- (0014). household_links connects two independent households for a
-- read-only "Combined" summary view (0015+) — it never merges ownership.
-- Goals (0007) is explicitly untouched by this migration and stays
-- user_id-scoped; the unapplied 0008 (goals contribution model) is unrelated
-- in-flight work and is not referenced here.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'owner',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- A user belongs to exactly one household in this task's model — invite/
-- accept links two separate households, it never adds a second member row
-- to an existing household. Enforced here, not just by convention.
create unique index household_members_one_household_per_user
  on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')) default 'pending',
  -- Fixed 7-day expiry, not user-configurable.
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index household_invites_household_idx on public.household_invites (household_id);
create index household_invites_email_idx on public.household_invites (lower(invited_email));

create table public.household_links (
  id uuid primary key default gen_random_uuid(),
  household_a_id uuid not null references public.households (id) on delete cascade,
  household_b_id uuid not null references public.households (id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'revoked')) default 'pending',
  created_at timestamptz not null default now(),
  -- Canonical ordering so (A,B) and (B,A) can never both exist as separate
  -- rows for the same pair — the unique constraint alone wouldn't catch a
  -- reversed-pair duplicate.
  constraint household_links_canonical_order check (household_a_id < household_b_id),
  unique (household_a_id, household_b_id)
);

create index household_links_a_idx on public.household_links (household_a_id, status);
create index household_links_b_idx on public.household_links (household_b_id, status);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.households enable row level security;
alter table public.households force row level security;
alter table public.household_members enable row level security;
alter table public.household_members force row level security;
alter table public.household_invites enable row level security;
alter table public.household_invites force row level security;
alter table public.household_links enable row level security;
alter table public.household_links force row level security;

-- Membership-check helper, SECURITY DEFINER so it can read
-- household_members without recursing through household_members' own RLS
-- policy (the classic self-referential-membership-table trap). Lives in a
-- private, non-exposed schema. Always re-checks auth.uid() internally —
-- never trusts a caller-supplied identity. EXECUTE is granted to
-- `authenticated` (unlike handle_new_user, which is only ever invoked via
-- trigger and grants EXECUTE to no one) because this function is called
-- directly inside RLS policy expressions evaluated for ordinary
-- authenticated queries, which requires EXECUTE privilege on the calling
-- role.
create schema if not exists private;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_household_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;

-- Used starting 0015 (summary views) but defined now alongside the rest of
-- the access-control primitives.
create or replace function private.is_linked_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_links hl
    join public.household_members hm on hm.user_id = (select auth.uid())
    where hl.status = 'active'
      and (
        (hl.household_a_id = hm.household_id and hl.household_b_id = target_household_id)
        or (hl.household_b_id = hm.household_id and hl.household_a_id = target_household_id)
      )
  );
$$;

revoke execute on function private.is_linked_household(uuid) from public, anon;
grant execute on function private.is_linked_household(uuid) to authenticated;

-- households: read-only from the client. Creation/mutation is trigger-only
-- (0014's SECURITY DEFINER handle_new_user, which bypasses RLS the same way
-- the migration-applying role does). No app code ever inserts/updates/
-- deletes a household directly.
create policy "select own household" on public.households
  for select to authenticated
  using (private.is_household_member(id));

-- household_members: read-only from the client, same reasoning.
create policy "select own household members" on public.household_members
  for select to authenticated
  using (private.is_household_member(household_id));

-- household_invites: the inviting household can see/manage its own
-- invites. Note the token-based pre-membership lookup needed by
-- acceptInvite (0016) does NOT go through this policy — it goes through a
-- SECURITY DEFINER RPC instead, since the accepting user isn't a member of
-- the inviting household yet.
create policy "select own household invites" on public.household_invites
  for select to authenticated
  using (private.is_household_member(household_id));
create policy "insert own household invite" on public.household_invites
  for insert to authenticated
  with check (private.is_household_member(household_id) and invited_by = (select auth.uid()));
create policy "update own household invite" on public.household_invites
  for update to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

-- household_links: either side of the link can see and revoke it —
-- revocation is unilateral, no mutual consent required. Insert is reached
-- only via the accept_household_invite RPC (0016), which runs as the
-- accepting user; this policy still has to allow that insert.
create policy "select own household links" on public.household_links
  for select to authenticated
  using (private.is_household_member(household_a_id) or private.is_household_member(household_b_id));
create policy "insert own household link" on public.household_links
  for insert to authenticated
  with check (private.is_household_member(household_a_id) or private.is_household_member(household_b_id));
create policy "update own household link" on public.household_links
  for update to authenticated
  using (private.is_household_member(household_a_id) or private.is_household_member(household_b_id))
  with check (private.is_household_member(household_a_id) or private.is_household_member(household_b_id));
