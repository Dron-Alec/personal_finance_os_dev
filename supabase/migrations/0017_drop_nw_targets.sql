-- Net Worth Targets (the quarterly CSV curve) is superseded by Goals
-- (lib/goals.ts) — a goal covers the same "target amount by date" job plus
-- contribution plans, per-account scoping, and live chart overlays. Drop
-- the table and stop seeding it on signup.
drop table public.nw_targets;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
begin
  insert into public.households (id, created_by)
  values (gen_random_uuid(), new.id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  insert into public.category_rules (user_id, rules)
  values (
    new.id,
    '[
      {"category": "Groceries", "keywords": ["TRADER JOE", "WHOLE FOOD", "WHOLEFDS", "STOP & SHOP", "ALDI", "PUBLIX", "WALMART", "WAL-MART", "WM SUPERCENTER", "JERSEY CITY BUY RITE", "GROCERY", "KROGER", "COSTCO", "SAFEWAY", "WEGMANS", "SHOPRITE", "GIANT", "HARRIS TEETER", "WOODMAN", "HY-VEE", "METCALFE", "METRO MARKET", "FESTIVAL FOODS", "PICK N SAVE", "WILLY ST", "FRESH MADISON", "MEIJER", "SENTRY FOODS", "TARGET"]},
      {"category": "Dining", "keywords": ["RESTAURANT", "CAFE", "COFFEE", "STARBUCKS", "DUNKIN", "PIZZA", "SUSHI", " BAR ", "TAVERN", "GRILL", "DINER", "CHIPOTLE", "CHICK-FIL", "MCDONALD", "BURGER", "SUBWAY", "PANERA", "PHO", "TACO", "TST*", "DOORDASH", "GRUBHUB", "UBEREATS", "SEAMLESS", "HYPPO", "IRREGARDLESS", "BREADS BAKERY"]},
      {"category": "Transportation", "keywords": ["MTA*", "MTA ", "PATH TAPP", "UBER", "LYFT", "SUNOCO", "SHELL", "EXXON", "PILOT ", "SHEETZ", " GAS ", "AMTRAK", "GREYHOUND", "DELTA", "AMERICAN AIR", "UNITED AIR", "SOUTHWEST", "PARKERS"]},
      {"category": "Utilities", "keywords": ["PSEG", "PUBLIC SERVICE", "COMCAST", "XFINITY", "CON ED", "NATIONAL GRID", "VERIZON", "AT&T", "T-MOBILE", "SPECTRUM"]},
      {"category": "Rent / Housing", "keywords": ["BALD COLLECTION", "RENT", "HOUSING", "APARTMENT", "MORTGAGE"]},
      {"category": "Subscriptions", "keywords": ["SPOTIFY", "NETFLIX", "HULU", "DISNEY", "AMAZON PRIME", "HBO", "APPLE.COM/BILL", "GOOGLE*", "YOUTUBE", "PATREON", "AUDIBLE", "PERPLEXITY", "CHATGPT", "OPENAI", "OURARING", "MEMBERSHIP FEE"]},
      {"category": "Shopping", "keywords": ["AMAZON", "TARGET 000", "CRATE AND BARREL", "NORDSTROM", "MACY", "H&M", "ZARA", "WALGREENS", "CVS", "RITE AID", "THE ATTIC", "SCHROPP", "KALSHI", "WALMART STORE", "PAPERSOURCE"]},
      {"category": "Health & Fitness", "keywords": ["PHARMACY", "OURA", "GYM", "PELOTON", "FITNESS", "HEALTH", "MEDICAL", "DENTAL", "VISION", "DOCTOR", "HOSPITAL"]},
      {"category": "Investments", "keywords": ["COINBASE", "FID BKG SVC", "FIDELITY", "VANGUARD", "SCHWAB", "ROBINHOOD", "E*TRADE", "TD AMERITRADE"]},
      {"category": "Income", "keywords": ["PAYROLL", "DIRECT DEPOSIT", "CROWE LLP", "JEWISHFEDERATION", "MESORAH"]},
      {"category": "Transfers", "keywords": ["VENMO", "ZELLE", "PAYPAL", "CASHAPP", "HALEY GRINER"]},
      {"category": "Internal Transfer", "keywords": ["TRANSFER FROM", "TRANSFER TO", "ONLINE PAYMENT", "BILL PAYMENT", "PAYMENT - THANK YOU", "PAYMENT THANK YOU", "AXOS BANK"]}
    ]'::jsonb
  );

  insert into public.account_templates (user_id, name, type, sort_order)
  select new.id, t.name, t.type, t.sort_order
  from (
    values
      ('Checking', 'Checking', 0),
      ('Savings', 'Savings', 1),
      ('Coinbase', 'Crypto', 2),
      ('401k', '401k', 3),
      ('Roth IRA', 'Roth IRA', 4),
      ('Taxable Brokerage', 'Brokerage / Stocks', 5),
      ('Other Investments', 'Other', 6)
  ) as t(name, type, sort_order);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
