// For the uptime monitor: 200 when the app is up and can reach Supabase
// Auth, 503 otherwise. Public, no session, returns no data.
export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return Response.json({ ok: res.ok }, { status: res.ok ? 200 : 503 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
