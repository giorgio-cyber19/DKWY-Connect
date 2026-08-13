"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cross, Eye, EyeOff, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

export default function SetupPage() {
  const router = useRouter();
  const { loading, needsSetup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !needsSetup) router.replace("/login");
  }, [loading, needsSetup, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Please fill in your name and email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await useAppStore.getState().createFirstAdmin({ name: name.trim(), email: email.trim(), password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading || !needsSetup) {
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

        <Sparkles size={26} className="text-[var(--color-gold-deep)] mb-3" />
        <h1 className="font-display text-2xl font-semibold mb-1.5">Set up your workspace</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-7">
          This is a fresh DWKY Connect workspace. Create the first administrator account to get started — you'll be able to add teachers, classes, and children from here.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Your Name</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grace Meadows"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Email address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@yourchurch.org"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
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
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Confirm Password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Create Admin Account
          </Button>
        </form>

        <p className="text-center text-[11px] text-[var(--text-secondary)] mt-6 leading-relaxed">
          Everything you enter is stored only in this browser. There is no public registration after this — only this admin account can create teacher logins.
        </p>
      </motion.div>
    </div>
  );
}
