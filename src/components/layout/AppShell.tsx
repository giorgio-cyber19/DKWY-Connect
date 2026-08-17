"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLiveSync } from "@/lib/use-live-sync";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalSearch } from "./GlobalSearch";
import { PageTransition } from "./PageTransition";
import { FAB } from "./FAB";
import { Cross } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, needsSetup } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useLiveSync();

  useEffect(() => {
    if (loading) return;
    if (needsSetup) router.replace("/setup");
    else if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/change-password");
  }, [loading, needsSetup, user, router]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading || needsSetup || !user || user.mustChangePassword) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)] flex items-center justify-center text-white">
            <Cross size={22} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{t("layout.loadingBrandPrefix")} DWKY Connect…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FAB />
    </div>
  );
}
