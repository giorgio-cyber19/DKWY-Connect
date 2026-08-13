"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cross } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { user, loading, needsSetup } = useAuth();
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
        <p className="text-sm text-[var(--text-secondary)]">Loading DWKY Connect…</p>
      </div>
    </div>
  );
}
