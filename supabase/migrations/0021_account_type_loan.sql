-- Adds "Loan" as a second unambiguous-liability account type alongside
-- "Credit Card" (see lib/constants.ts LIABILITY_TYPES / signedBalance).
alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts add constraint accounts_type_check check (type in (
  'Checking', 'Savings', 'Credit Card', 'Loan',
  'Brokerage / Stocks', '401k', 'Roth IRA', 'Traditional IRA',
  'Crypto', 'Real Estate', 'Other'
));

alter table public.account_templates drop constraint account_templates_type_check;
alter table public.account_templates add constraint account_templates_type_check check (type in (
  'Checking', 'Savings', 'Credit Card', 'Loan',
  'Brokerage / Stocks', '401k', 'Roth IRA', 'Traditional IRA',
  'Crypto', 'Real Estate', 'Other'
));
