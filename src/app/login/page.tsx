"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, needsSetup, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const signedOutIdle = useSearchParams().get("reason") === "idle";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (needsSetup) router.replace("/setup");
  }, [needsSetup, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await login(identifier, password, keepSignedIn);
    if (!ok) {
      setError(t("auth.loginFailed"));
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-dvh" />;
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden px-4 py-10">
      <BackgroundDecor />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 rounded-[28px] overflow-hidden card-shadow-hover glass-solid"
      >
        {/* Left brand panel — fixed colors on purpose, see .login-panel-gold */}
        <div className="login-panel-gold hidden md:flex flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image src="/seal.png" alt="DWKY Connect" fill sizes="40px" className="object-cover" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">DWKY Connect</span>
          </div>

          <div>
            <h2 className="font-display text-3xl leading-tight font-semibold mb-3">
              {t("auth.marketingHeadline")}
            </h2>
            <p className="text-[#151a2d]/70 text-sm leading-relaxed max-w-xs">
              {t("auth.marketingTagline")}
            </p>
          </div>

          <div className="text-xs text-[#151a2d]/65">
            {t("auth.copyrightFooter")}
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold mb-1">{t("auth.welcomeBack")}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t("auth.signInSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.emailOrUsername")}</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  type="text"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
                  placeholder={t("auth.identifierPlaceholder")}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.password")}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {signedOutIdle && !error && (
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-lg px-3 py-2">
                {t("auth.signedOutIdle")}
              </p>
            )}
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="accent-[var(--color-gold)]"
                />
                {t("auth.keepSignedIn")}
              </label>
              <Link href="/forgot-password" className="font-semibold text-[var(--color-blue-deep)] hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {submitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>

          <p className="text-center text-[11px] text-[var(--text-secondary)] mt-6 leading-relaxed">
            {t("auth.loginFooter")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, var(--color-gold), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.15 }}
        className="absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, var(--color-blue), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full blur-3xl opacity-15"
        style={{ background: "radial-gradient(circle, var(--color-sage), transparent 70%)" }}
      />
    </div>
  );
}
