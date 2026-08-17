"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cross, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!currentPassword) {
      setError(t("auth.errorEnterCurrentPassword"));
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
      await useAppStore.getState().changeOwnPassword(currentPassword, newPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(translateApiError(err, language));
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <div className="min-h-dvh" />;
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
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-gold-deep)] flex items-center justify-center text-white">
            <Cross size={20} strokeWidth={2.4} />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">DWKY Connect</span>
        </div>

        <KeyRound size={26} className="text-[var(--color-gold-deep)] mb-3" />
        <h1 className="font-display text-2xl font-semibold mb-1.5">
          {user.mustChangePassword ? t("auth.setYourPasswordHeading") : t("auth.changeYourPasswordHeading")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-7">
          {user.mustChangePassword ? t("auth.setPasswordDescription") : t("auth.changePasswordDescription")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.currentPassword")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("auth.newPassword")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            {t("auth.updatePassword")}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
