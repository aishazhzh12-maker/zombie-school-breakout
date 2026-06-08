import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, LogIn, LogOut, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login | Escape the School" },
      { name: "description", content: "Sign in to your Escape the School account." },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setCurrentEmail(data.session?.user.email ?? null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentEmail(session?.user.email ?? null);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const credentials = {
      email: email.trim(),
      password,
    };

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm the account, then come back and sign in.");
      return;
    }

    setMessage(mode === "login" ? "Signed in successfully." : "Account created.");
    await navigate({ to: "/" });
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    setMessage("");

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (googleError) {
      setLoading(false);
      setError(googleError.message);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setError("");
    setMessage("");
    const { error: signOutError } = await supabase.auth.signOut();
    setLoading(false);
    if (signOutError) setError(signOutError.message);
    else setMessage("Signed out.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
        <Button asChild variant="ghost" className="mb-6 w-fit px-0 text-muted-foreground">
          <Link to="/">
            <ArrowLeft />
            Back to game
          </Link>
        </Button>

        <section className="rounded-md border border-border bg-card p-5 shadow-xl">
          <div className="mb-5">
            <h1 className="font-display text-2xl text-primary">Player Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Save your account and come back to the school breakout later.
            </p>
          </div>

          {checkingSession ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking session...
            </div>
          ) : currentEmail ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-background p-3 text-sm">
                Signed in as <span className="text-primary">{currentEmail}</span>
              </div>
              <Button onClick={handleSignOut} disabled={loading} variant="outline" className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut />}
                Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                variant="outline"
                className="w-full bg-background"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>Email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded px-3 py-2 text-sm transition-colors ${
                    mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded px-3 py-2 text-sm transition-colors ${
                    mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign up
                </button>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Email</span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Password</span>
                <Input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "login" ? (
                  <LogIn />
                ) : (
                  <UserPlus />
                )}
                {mode === "login" ? "Login" : "Create account"}
              </Button>
              </form>
            </div>
          )}

          {message && <p className="mt-4 rounded-md border border-emerald-700 bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p>}
          {error && <p className="mt-4 rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
        </section>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.44Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.86-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}
