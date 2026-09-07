"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";
import { apiPost } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";

export default function ForgotPasswordPage() {
  const { t, language } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await apiPost("/api/auth/forgot-password", { identifier: identifier.trim() });
      setSent(true);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, var(--color-gold), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, var(--color-blue), transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-[28px] overflow-hidden card-shadow-hover glass-solid p-8 sm:p-10"
      >
        {sent ? (
          <>
            <CheckCircle2 size={26} className="text-[var(--color-blue)] mb-3" />
            <h1 className="font-display text-2xl font-semibold mb-1.5">{t("auth.resetLinkSentHeading")}</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed">{t("auth.resetLinkSentMessage")}</p>
            <Link href="/login" className="text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </>
        ) : (
          <>
            <KeyRound size={26} className="text-[var(--color-gold-deep)] mb-3" />
            <h1 className="font-display text-2xl font-semibold mb-1.5">{t("auth.forgotPasswordHeading")}</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed">{t("auth.forgotPasswordDescription")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.emailOrUsername")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    type="text"
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
                    placeholder={t("auth.identifierPlaceholder")}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              <Button type="submit" className="w-full" size="lg" loading={submitting}>
                {t("auth.sendResetLink")}
              </Button>
            </form>

            <Link href="/login" className="block mt-6 text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
