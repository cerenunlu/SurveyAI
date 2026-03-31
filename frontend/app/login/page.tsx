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
      setErrorMessage(error instanceof Error ? error.message : "Şu anda giriş yapılamıyor.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-layout">
        <div className="auth-hero panel-card">
          <span className="eyebrow">SurveyAI Erişimi</span>
          <h1 className="hero-title auth-title">Giriş yapın ve uygulama aktif şirket bağlamını sizin için çözümlesin.</h1>
          <p className="hero-text">
            Bu MVP giriş akışı, kimlik doğrulamayı bilinçli olarak sade tutarken ürüne mevcut anket ve operasyon
            iş akışlarının tamamı için gerçek bir güncel kullanıcı ve güncel şirket temeli kazandırır.
          </p>
          <div className="chip-row">
            <span className="chip">Güncel şirket bağlamı</span>
            <span className="chip">Çerez destekli oturum</span>
            <span className="chip">MVP e-posta ve parola</span>
          </div>
        </div>

        <section className="auth-card panel-card">
          <div className="section-copy">
            <h2>Giriş</h2>
            <p>Kontrol merkezine devam etmek için iş e-posta adresinizi ve parolanızı kullanın.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="builder-field">
              <span>E-posta</span>
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
                <strong>Giriş başarısız</strong>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <button type="submit" className="button-primary auth-submit" disabled={isSubmitting || status === "loading"}>
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <div className="auth-helper">
            <strong>Yerel başlangıç hesabı</strong>
            <p>Varsayılan yerel bilgiler: owner@acme-research.test / change-me-123</p>
          </div>
        </section>
      </section>
    </main>
  );
}
