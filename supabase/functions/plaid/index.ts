// The only place Candid talks to Plaid. Deployed with verify_jwt off
// because Plaid's webhook carries no Supabase JWT — user actions check the
// caller's JWT (and aal2) themselves, the webhook checks Plaid's signature.
//
// Secrets (Supabase → Edge Functions → Secrets): PLAID_CLIENT_ID,
// PLAID_SECRET, PLAID_ENV ("sandbox" | "production"). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import * as jose from "npm:jose@6.2.15";
import {
  candidAccountType,
  candidBalance,
  toTransactionRow,
  type CategoryRule,
  type PlaidAccount,
  type PlaidTransaction,
} from "./mapping.ts";

const PLAID_BASE = Deno.env.get("PLAID_ENV") === "production" ? "https://production.plaid.com" : "https://sandbox.plaid.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/plaid/webhook`;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*", // bearer-token auth, no cookies
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
class PlaidError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  console[level === "info" ? "log" : level](JSON.stringify({ level, event, ...fields }));
}

async function plaid<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(PLAID_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: Deno.env.get("PLAID_CLIENT_ID"), secret: Deno.env.get("PLAID_SECRET"), ...body }),
  });
  const json = await res.json();
  if (!res.ok) throw new PlaidError(json.error_code ?? "UNKNOWN", json.error_message ?? "Plaid request failed");
  return json as T;
}

// ---------- auth ----------

async function caller(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jwt) throw new HttpError(401, "Not signed in.");
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, "Not signed in.");
  if (jose.decodeJwt(jwt).aal !== "aal2") throw new HttpError(403, "MFA required.");
  const { data: m } = await admin.from("household_members").select("household_id").eq("user_id", data.user.id).single();
  if (!m) throw new HttpError(403, "No household.");
  return { userId: data.user.id, householdId: m.household_id as string };
}

async function ownItem(householdId: string, itemId: unknown) {
  if (typeof itemId !== "string") throw new HttpError(400, "Missing item_id.");
  const { data } = await admin
    .from("plaid_items")
    .select("id, plaid_item_id, household_id, cursor, import_from, status")
    .eq("id", itemId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!data) throw new HttpError(404, "Connection not found.");
  return data;
}

async function accessToken(itemId: string): Promise<string> {
  const { data, error } = await admin.rpc("plaid_access_token", { p_item_id: itemId });
  if (error || !data) throw new Error("Access token missing for item");
  return data as string;
}

// ---------- sync ----------

async function syncItem(itemId: string) {
  const { data: item } = await admin
    .from("plaid_items")
    .select("id, household_id, cursor, import_from")
    .eq("id", itemId)
    .single();
  if (!item) throw new Error("Item not found");
  const token = await accessToken(itemId);

  const { data: accts } = await admin.from("accounts").select("name, plaid_account_id").eq("plaid_item_id", itemId);
  const accountNames = new Map((accts ?? []).map((a) => [a.plaid_account_id as string, a.name as string]));
  const { data: member } = await admin.from("household_members").select("user_id").eq("household_id", item.household_id).limit(1).single();
  const { data: ruleRow } = await admin.from("category_rules").select("rules").eq("user_id", member?.user_id).maybeSingle();
  const rules = (ruleRow?.rules ?? []) as CategoryRule[];

  type SyncPage = {
    added: PlaidTransaction[];
    modified: PlaidTransaction[];
    removed: { transaction_id: string }[];
    accounts: PlaidAccount[];
    next_cursor: string;
    has_more: boolean;
  };

  // Plaid can ask us to restart pagination if data changed mid-way.
  let page: { added: PlaidTransaction[]; modified: PlaidTransaction[]; removed: string[]; accounts: PlaidAccount[]; cursor: string } | null = null;
  for (let attempt = 0; attempt < 3 && !page; attempt++) {
    const acc = { added: [] as PlaidTransaction[], modified: [] as PlaidTransaction[], removed: [] as string[], accounts: [] as PlaidAccount[], cursor: item.cursor ?? "" };
    try {
      for (;;) {
        const r = await plaid<SyncPage>("/transactions/sync", {
          access_token: token,
          ...(acc.cursor ? { cursor: acc.cursor } : {}),
          count: 500,
        });
        acc.added.push(...r.added);
        acc.modified.push(...r.modified);
        acc.removed.push(...r.removed.map((x) => x.transaction_id));
        acc.accounts = r.accounts;
        acc.cursor = r.next_cursor;
        if (!r.has_more) break;
      }
      page = acc;
    } catch (e) {
      if (!(e instanceof PlaidError && e.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION")) throw e;
    }
  }
  if (!page) throw new Error("Sync kept changing during pagination");

  const ctx = { householdId: item.household_id, importFrom: item.import_from, accountNames, rules };
  const rows = page.added.map((t) => toTransactionRow(t, ctx)).filter((r) => r !== null);
  if (rows.length) {
    const { error } = await admin.from("transactions").upsert(rows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
    if (error) throw new Error(`insert failed: ${error.code}`);
  }
  // ponytail: one UPDATE per modified transaction; batch it if Plaid volumes get large.
  // Category is left alone — the user may have re-categorized it.
  for (const t of page.modified) {
    const row = toTransactionRow(t, ctx);
    if (!row) continue;
    await admin
      .from("transactions")
      .update({ date: row.date, description: row.description, amount: row.amount })
      .eq("plaid_transaction_id", t.transaction_id);
  }
  if (page.removed.length) {
    await admin.from("transactions").delete().in("plaid_transaction_id", page.removed);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const a of page.accounts) {
    if (!accountNames.has(a.account_id)) continue;
    await admin.from("accounts").update({ balance: candidBalance(a), as_of_date: today }).eq("plaid_account_id", a.account_id);
  }

  await admin
    .from("plaid_items")
    .update({ cursor: page.cursor, last_synced_at: new Date().toISOString(), status: "active", error_code: null })
    .eq("id", itemId);

  const result = { added: rows.length, modified: page.modified.length, removed: page.removed.length };
  log("info", "plaid.synced", { item_id: itemId, ...result });
  return result;
}

async function markItemError(itemId: string, code: string) {
  const status = ["ITEM_LOGIN_REQUIRED", "PENDING_EXPIRATION", "PENDING_DISCONNECT"].includes(code) ? "login_required" : "error";
  await admin.from("plaid_items").update({ status, error_code: code }).eq("id", itemId);
  log("warn", "plaid.item_error", { item_id: itemId, code });
}

async function removeItem(itemId: string) {
  try {
    await plaid("/item/remove", { access_token: await accessToken(itemId) });
  } catch (e) {
    // Already gone at Plaid is fine; anything else is logged but we still
    // delete our side so the token doesn't outlive the user's intent.
    if (!(e instanceof PlaidError && e.code === "ITEM_NOT_FOUND")) log("error", "plaid.remove_failed", { item_id: itemId, code: (e as PlaidError).code });
  }
  await admin.from("accounts").update({ plaid_account_id: null }).eq("plaid_item_id", itemId);
  await admin.from("plaid_items").delete().eq("id", itemId); // trigger deletes the vault secret
}

// ---------- user actions ----------

async function listAccounts(itemId: string) {
  const { accounts } = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", { access_token: await accessToken(itemId) });
  const { data: linked } = await admin.from("accounts").select("id, plaid_account_id").eq("plaid_item_id", itemId);
  const linkedTo = new Map((linked ?? []).map((a) => [a.plaid_account_id, a.id]));
  return accounts.map((a) => ({
    plaid_account_id: a.account_id,
    name: a.name,
    mask: a.mask ?? null,
    suggested_type: candidAccountType(a),
    balance: candidBalance(a),
    linked_account_id: linkedTo.get(a.account_id) ?? null,
  }));
}

type MappingChoice =
  | { plaid_account_id: string; action: "link"; account_id: number }
  | { plaid_account_id: string; action: "create"; name: string; type: string }
  | { plaid_account_id: string; action: "skip" };

async function handleAction(req: Request) {
  const { userId, householdId } = await caller(req);
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case "link_token": {
      const base = {
        user: { client_user_id: userId },
        client_name: "Candid",
        language: "en",
        country_codes: ["US"],
        webhook: WEBHOOK_URL,
      };
      const extra = body.item_id
        ? { access_token: await accessToken((await ownItem(householdId, body.item_id)).id) } // update mode (re-auth)
        : { products: ["transactions"], transactions: { days_requested: 730 } };
      const r = await plaid<{ link_token: string }>("/link/token/create", { ...base, ...extra });
      return { link_token: r.link_token };
    }

    case "exchange": {
      if (typeof body.public_token !== "string") throw new HttpError(400, "Missing public_token.");
      if (typeof body.import_from !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.import_from)) {
        throw new HttpError(400, "Invalid import_from date.");
      }
      const ex = await plaid<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
        public_token: body.public_token,
      });
      const { data: itemId, error } = await admin.rpc("plaid_store_item", {
        p_household_id: householdId,
        p_plaid_item_id: ex.item_id,
        p_institution_name: typeof body.institution_name === "string" ? body.institution_name.slice(0, 100) : null,
        p_access_token: ex.access_token,
        p_import_from: body.import_from,
        p_created_by: userId,
      });
      if (error) throw new Error(`store failed: ${error.code}`);
      log("info", "plaid.connected", { item_id: itemId });
      return { item_id: itemId, accounts: await listAccounts(itemId as string) };
    }

    case "accounts": {
      // Re-open the "choose accounts" step for an existing connection.
      const item = await ownItem(householdId, body.item_id);
      return { item_id: item.id, accounts: await listAccounts(item.id) };
    }

    case "map_accounts": {
      const item = await ownItem(householdId, body.item_id);
      const choices = (Array.isArray(body.accounts) ? body.accounts : []) as MappingChoice[];
      const { accounts: plaidAccounts } = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", {
        access_token: await accessToken(item.id),
      });
      const byId = new Map(plaidAccounts.map((a) => [a.account_id, a]));
      const today = new Date().toISOString().slice(0, 10);
      for (const c of choices) {
        const pa = byId.get(c.plaid_account_id);
        if (!pa || c.action === "skip") continue;
        if (c.action === "link") {
          const { data, error } = await admin
            .from("accounts")
            .update({ plaid_account_id: pa.account_id, plaid_item_id: item.id, balance: candidBalance(pa), as_of_date: today })
            .eq("id", c.account_id)
            .eq("household_id", householdId)
            .is("plaid_account_id", null)
            .select("id");
          if (error || !data?.length) throw new HttpError(400, "That account can't be linked (already linked, or not yours).");
        } else if (c.action === "create") {
          const name = String(c.name ?? "").trim().slice(0, 80);
          if (!name) throw new HttpError(400, "Account name is required.");
          const { error } = await admin.from("accounts").insert({
            household_id: householdId,
            name,
            type: c.type,
            balance: candidBalance(pa),
            as_of_date: today,
            plaid_account_id: pa.account_id,
            plaid_item_id: item.id,
          });
          if (error?.code === "23505") throw new HttpError(400, `You already have an account named "${name}".`);
          if (error) throw new HttpError(400, "Couldn't create that account.");
        }
      }
      return await syncItem(item.id);
    }

    case "sync": {
      const item = await ownItem(householdId, body.item_id);
      try {
        return await syncItem(item.id);
      } catch (e) {
        if (e instanceof PlaidError) {
          await markItemError(item.id, e.code);
          throw new HttpError(409, e.code === "ITEM_LOGIN_REQUIRED" ? "Your bank needs you to sign in again." : "Your bank connection has a problem.");
        }
        throw e;
      }
    }

    case "reconnected": {
      // After update-mode Link succeeds; nothing to exchange.
      const item = await ownItem(householdId, body.item_id);
      await admin.from("plaid_items").update({ status: "active", error_code: null }).eq("id", item.id);
      return await syncItem(item.id);
    }

    case "disconnect": {
      const item = await ownItem(householdId, body.item_id);
      await removeItem(item.id);
      log("info", "plaid.disconnected", { item_id: item.id });
      return { ok: true };
    }

    case "remove_all": {
      // Called before delete_own_account.
      const { data: items } = await admin.from("plaid_items").select("id").eq("household_id", householdId);
      for (const i of items ?? []) await removeItem(i.id);
      return { removed: items?.length ?? 0 };
    }

    default:
      throw new HttpError(400, "Unknown action.");
  }
}

// ---------- webhook ----------

const keyCache = new Map<string, CryptoKey | Uint8Array>();

async function verifyPlaidWebhook(req: Request, rawBody: string): Promise<boolean> {
  const token = req.headers.get("plaid-verification");
  if (!token) return false;
  try {
    const { alg, kid } = jose.decodeProtectedHeader(token);
    if (alg !== "ES256" || !kid) return false;
    let key = keyCache.get(kid);
    if (!key) {
      const r = await plaid<{ key: jose.JWK }>("/webhook_verification_key/get", { key_id: kid });
      key = await jose.importJWK(r.key, "ES256");
      keyCache.set(kid, key);
    }
    const { payload } = await jose.jwtVerify(token, key, { maxTokenAge: "5 min", algorithms: ["ES256"] });
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
    const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
    return typeof payload.request_body_sha256 === "string" && payload.request_body_sha256 === hex;
  } catch (e) {
    // A failed key fetch (bad credentials, Plaid down) isn't a forged webhook — say which.
    if (e instanceof PlaidError) log("error", "plaid.webhook_key_fetch_failed", { code: e.code });
    return false;
  }
}

async function handleWebhook(req: Request): Promise<Response> {
  const raw = await req.text();
  if (!(await verifyPlaidWebhook(req, raw))) {
    log("warn", "plaid.webhook_rejected");
    return new Response("invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw) as {
    webhook_type: string;
    webhook_code: string;
    item_id: string;
    error?: { error_code?: string } | null;
  };
  const { data: item } = await admin.from("plaid_items").select("id").eq("plaid_item_id", event.item_id).maybeSingle();
  log("info", "plaid.webhook", { type: event.webhook_type, code: event.webhook_code, known_item: !!item });
  if (!item) return new Response("ok");

  try {
    if (event.webhook_type === "TRANSACTIONS" && event.webhook_code === "SYNC_UPDATES_AVAILABLE") {
      await syncItem(item.id);
    } else if (event.webhook_type === "ITEM") {
      if (event.webhook_code === "ERROR") await markItemError(item.id, event.error?.error_code ?? "UNKNOWN");
      else if (["PENDING_EXPIRATION", "PENDING_DISCONNECT", "USER_PERMISSION_REVOKED"].includes(event.webhook_code)) {
        await markItemError(item.id, event.webhook_code);
      } else if (event.webhook_code === "LOGIN_REPAIRED") {
        await admin.from("plaid_items").update({ status: "active", error_code: null }).eq("id", item.id);
      }
    }
  } catch (e) {
    if (e instanceof PlaidError) await markItemError(item.id, e.code);
    else log("error", "plaid.webhook_failed", { message: (e as Error).message });
  }
  // Always 200 once verified, so Plaid doesn't retry what we've recorded.
  return new Response("ok");
}

// ---------- entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });

  if (new URL(req.url).pathname.endsWith("/webhook")) return handleWebhook(req);

  try {
    const result = await handleAction(req);
    return Response.json(result, { headers: CORS });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof HttpError ? e.message : "Something went wrong talking to your bank.";
    if (status === 500) log("error", "plaid.action_failed", { message: (e as Error).message, code: (e as PlaidError).code });
    return Response.json({ error: message }, { status, headers: CORS });
  }
});
