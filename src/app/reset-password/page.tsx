"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";
import { apiPost, ApiError } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";

function ResetPasswordForm() {
  const { t, language } = useLanguage();
  const token = useSearchParams().get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(translateApiError(new ApiError(400, "invalid_reset_token", "Missing reset token."), language));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.errorNewPasswordTooShort"));
      return;
    }
    if (newPassword !== confirm) {
      setError(t("auth.errorNewPasswordsDontMatch"));
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/auth/reset-password", { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <CheckCircle2 size={26} className="text-[var(--color-blue)] mb-3" />
        <h1 className="font-display text-2xl font-semibold mb-1.5">{t("auth.resetPasswordSuccessHeading")}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed">{t("auth.resetPasswordSuccessMessage")}</p>
        <Link href="/login" className="text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </>
    );
  }

  return (
    <>
      <KeyRound size={26} className="text-[var(--color-gold-deep)] mb-3" />
      <h1 className="font-display text-2xl font-semibold mb-1.5">{t("auth.resetPasswordHeading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-7">{t("auth.resetPasswordDescription")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.newPassword")}</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
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
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">{t("auth.newPasswordHint")}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.confirmNewPassword")}</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-500 font-medium space-y-1">
            <p>{error}</p>
            <Link href="/forgot-password" className="underline">
              {t("auth.requestNewLink")}
            </Link>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          {t("auth.resetPassword")}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="h-40" />}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
