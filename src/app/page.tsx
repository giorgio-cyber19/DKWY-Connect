"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cross } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function RootPage() {
  const { user, loading, needsSetup } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (needsSetup) router.replace("/setup");
    else router.replace(user ? "/dashboard" : "/login");
  }, [loading, needsSetup, user, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)] flex items-center justify-center text-white">
          <Cross size={22} />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{t("layout.loadingBrandPrefix")} DWKY Connect…</p>
        <p className="max-w-sm text-center text-xs text-[var(--text-secondary)] leading-relaxed">{t("auth.homeDescription")}</p>
        <p className="text-[11px] text-[var(--text-secondary)]">
          <Link href="/privacy" className="underline">
            {t("auth.privacyLink")}
          </Link>
          {" · "}
          <Link href="/terms" className="underline">
            {t("auth.termsLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
