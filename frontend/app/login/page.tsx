"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { status, login } = useAuth();
  const [email, setEmail] = useState("owner@acme-research.test");
  const [password, setPassword] = useState("change-me-123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in right now.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-layout">
        <div className="auth-hero panel-card">
          <span className="eyebrow">SurveyAI Access</span>
          <h1 className="hero-title auth-title">Sign in and let the app resolve the active company for you.</h1>
          <p className="hero-text">
            This MVP login flow keeps auth deliberately simple while giving the product a real current-user and
            current-company foundation for all existing survey and operation workflows.
          </p>
          <div className="chip-row">
            <span className="chip">Current company context</span>
            <span className="chip">Cookie-backed session</span>
            <span className="chip">MVP email and password</span>
          </div>
        </div>

        <section className="auth-card panel-card">
          <div className="section-copy">
            <h2>Login</h2>
            <p>Use your work email and password to continue into the control center.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="builder-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@acme-research.test"
                disabled={isSubmitting || status === "loading"}
              />
            </label>

            <label className="builder-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="change-me-123"
                disabled={isSubmitting || status === "loading"}
              />
            </label>

            {errorMessage ? (
              <div className="operation-inline-message is-danger compact">
                <strong>Login failed</strong>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <button type="submit" className="button-primary auth-submit" disabled={isSubmitting || status === "loading"}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="auth-helper">
            <strong>Local seed account</strong>
            <p>Default local credentials: owner@acme-research.test / change-me-123</p>
          </div>
        </section>
      </section>
    </main>
  );
}
