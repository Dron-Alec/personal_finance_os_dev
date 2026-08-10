"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MfaEnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.enroll({ factorType: "totp" }).then(({ data, error }) => {
      if (error) {
        setError(error.message);
      } else {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      }
      setLoading(false);
    });
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setVerifying(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setVerifying(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirect || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Set up two-factor authentication</CardTitle>
          <CardDescription>
            Required before you can access your data. Scan this QR code with an authenticator
            app (e.g. Google Authenticator, 1Password, Authy).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {qrCode && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="Scan with your authenticator app" className="h-48 w-48" />
              {secret && (
                <p className="break-all text-center text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this key manually: <code>{secret}</code>
                </p>
              )}
              <form onSubmit={onVerify} className="mt-2 flex w-full flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={verifying || code.length !== 6}>
                  {verifying ? "Verifying…" : "Verify & continue"}
                </Button>
              </form>
            </div>
          )}
          {error && !qrCode && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
