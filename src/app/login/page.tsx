"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Cross, Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login, needsSetup, loading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (needsSetup) router.replace("/setup");
  }, [needsSetup, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await login(identifier, password);
    if (!ok) {
      setError("That email/username and password don't match an account.");
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
        {/* Left brand panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[var(--color-gold-deep)] via-[var(--color-gold)] to-[var(--color-blue-deep)] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white, transparent 45%)" }} />
          <div className="relative flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Cross size={20} strokeWidth={2.4} />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">DWKY Connect</span>
          </div>

          <div className="relative animate-float-slow">
            <Sparkles size={30} className="mb-4 opacity-90" />
            <h2 className="font-display text-3xl leading-tight font-semibold mb-3">
              A joyful home for our Sunday School ministry.
            </h2>
            <p className="text-white/85 text-sm leading-relaxed max-w-xs">
              Lesson plans, portfolios, prayer, and community — all in one warm, organized place for our teaching team.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-white/75">
            <ShieldCheck size={15} />
            Private staff intranet — not publicly accessible
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold mb-1">Welcome back</h1>
            <p className="text-sm text-[var(--text-secondary)]">Sign in to your DWKY Connect workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Email or Username</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  type="text"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
                  placeholder="you@yourchurch.org or username"
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

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[var(--color-gold)]" />
                Keep me signed in
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-[11px] text-[var(--text-secondary)] mt-6 leading-relaxed">
            No public registration. Accounts are created by your Sunday School administrator.
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
