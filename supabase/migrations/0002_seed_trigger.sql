-- Seeds a new user's category_rules and nw_targets immediately after
-- signup, before their JWT/RLS context exists — the one legitimate use of
-- SECURITY DEFINER here. Not exposed as a callable RPC: EXECUTE is revoked
-- from every client-facing role, so it can only run via the AFTER INSERT
-- trigger on auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

  insert into public.nw_targets (user_id, quarter, target_net_worth)
  select new.id, q.quarter, q.target_net_worth
  from (
    values
      ('2025-Q3', 37572.5), ('2025-Q4', 45000.0),
      ('2026-Q1', 55000.0), ('2026-Q2', 68000.0), ('2026-Q3', 85000.0), ('2026-Q4', 105000.0),
      ('2027-Q1', 135000.0), ('2027-Q2', 175000.0), ('2027-Q3', 225000.0), ('2027-Q4', 290000.0),
      ('2028-Q1', 375000.0), ('2028-Q2', 475000.0), ('2028-Q3', 595000.0), ('2028-Q4', 735000.0),
      ('2029-Q1', 890000.0), ('2029-Q2', 1050000.0), ('2029-Q3', 1190000.0), ('2029-Q4', 1312500.0)
  ) as q(quarter, target_net_worth);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
