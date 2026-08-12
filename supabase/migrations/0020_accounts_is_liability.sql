-- Every ACCOUNT_TYPES value except "Credit Card" and "Other" is
-- unambiguously an asset, and Credit Card is unambiguously a liability
-- (handled by lib/constants.ts's signedBalance without needing a stored
-- flag). "Other" is the one type ambiguous enough to need an explicit
-- per-account choice — a collectible or a loan you're owed is an asset: a
-- personal loan or medical debt someone tracks under "Other" is a
-- liability. Defaults to false (asset) so every existing "Other" account
-- keeps its current sign unchanged.
alter table public.accounts add column is_liability boolean not null default false;
