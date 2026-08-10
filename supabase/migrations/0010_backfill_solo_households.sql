-- One-time backfill: every existing auth.users row gets a solo household +
-- owner membership row. Only needed once — 0014 extends handle_new_user()
-- to do this automatically for all future signups.
insert into public.households (id, name, created_by)
select gen_random_uuid(), null, u.id
from auth.users u;

insert into public.household_members (household_id, user_id, role)
select h.id, h.created_by, 'owner'
from public.households h;
