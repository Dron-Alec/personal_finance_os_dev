-- Review step for shared custom bank formats. Before this, a format was
-- visible to every user the moment anyone saved it — so a bad (or
-- malicious) mapping, e.g. debit/credit swapped, silently corrupted the
-- imports of everyone who picked it. Now a new format is usable only by
-- its creator until approved.
--
-- Approving is manual for now (Dashboard SQL editor, runs as postgres):
--   select id, name, review_flags, created_at from public.custom_bank_formats where status = 'pending';
--   update public.custom_bank_formats set status = 'approved' where id = <id>;   -- or 'rejected'

alter table public.custom_bank_formats
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column review_flags text[] not null default '{}';

-- Already in use before review existed; checked by hand when this landed.
update public.custom_bank_formats set status = 'approved';

-- Name squatting: "chase checking", "Chase-Checking" and "CHASE CHECKING"
-- are all the same name. Built-in names are reserved outright (picking one
-- would shadow nothing — built-ins win at import — but it shows up as a
-- confusing duplicate). Keep this list in sync with BANK_FORMATS in
-- lib/constants.ts; lib/__tests__/custom-format-review.test.ts enforces it.
create function private.normalize_format_name(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'));
$$;

create unique index custom_bank_formats_normalized_name_key
  on public.custom_bank_formats (private.normalize_format_name(name));

alter table public.custom_bank_formats
  add constraint custom_bank_formats_name_length check (char_length(btrim(name)) between 2 and 60),
  add constraint custom_bank_formats_name_not_builtin check (
    private.normalize_format_name(name) not in (
      'allybank', 'americanexpress', 'applecard', 'axoschecking', 'axossavings',
      'bankofamericachecking', 'bankofamericacredit', 'capitalone360',
      'capitalonecredit', 'chasechecking', 'chasecredit', 'citichecking',
      'citicredit', 'discover', 'paypal', 'pnc', 'usbank', 'venmo',
      'wellsfargochecking', 'wellsfargocredit'
    )
  );

-- Clients can't self-approve, and the reviewer gets hints. Runs on every
-- insert, so a direct PostgREST insert (bypassing the app) is covered too.
create function private.custom_format_review_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'pending';
  new.review_flags := '{}';
  if new.amount_type = 'split_debit_credit' then
    if new.debit_column = new.credit_column then
      new.review_flags := array_append(new.review_flags, 'debit_and_credit_same_column');
    end if;
    -- Header names that say the opposite of the role they were mapped to.
    if new.debit_column ~* '(credit|deposit|payment|refund)'
       or new.credit_column ~* '(debit|withdraw|charge|purchase)' then
      new.review_flags := array_append(new.review_flags, 'debit_credit_maybe_swapped');
    end if;
  end if;
  return new;
end;
$$;

create trigger custom_format_review_flags
  before insert on public.custom_bank_formats
  for each row execute function private.custom_format_review_flags();

-- Approved formats are shared; your own pending ones are visible only to you.
drop policy "select all authenticated" on public.custom_bank_formats;
create policy "select approved or own pending" on public.custom_bank_formats
  for select to authenticated
  using (status = 'approved' or (status = 'pending' and created_by = (select auth.uid())));
