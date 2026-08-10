-- Drops the fixed-baseline pace column in favor of a rolling model: pace
-- is now always computed from today's balance + trailing balance history,
-- never from a snapshot frozen at goal-creation time (see lib/goals.ts).
-- Adds optional contribution-model plumbing for future use — the creation
-- form stays 3 fields (scope, target amount, target date); these columns
-- are just there so a strategy can be attached later without a migration.
alter table public.goals drop column starting_amount;
alter table public.goals add column contribution_model text;
alter table public.goals add column contribution_params jsonb not null default '{}'::jsonb;
