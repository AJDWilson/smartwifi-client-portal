"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    params.get("error") === "credentials"
      ? "That username or password is not recognised."
      : null,
  );
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "That username or password is not recognised.");
        setPending(false);
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Could not reach the portal. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 text-foreground shadow-2xl sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The client list is for the SmartWifi team. Sign in to open it from the office or on site.
      </p>
      <form className="mt-6 grid gap-4" method="post" action="/api/login" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-11"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11"
            required
          />
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" className="mt-1 h-11" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
