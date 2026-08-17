"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Cross, ChevronsLeft, X } from "lucide-react";
import { navItems } from "./nav-items";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const items = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  const content = (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-2.5 px-4 h-16 shrink-0", collapsed && "justify-center px-0")}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-gold-deep)] flex items-center justify-center text-white shrink-0 shadow-[0_2px_8px_-2px_rgba(201,154,63,0.6)]">
          <Cross size={17} strokeWidth={2.4} />
        </div>
        {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              className="font-display font-semibold text-[15px] whitespace-nowrap overflow-hidden"
            >
              DWKY Connect
            </motion.span>
          )}
        <button onClick={onCloseMobile} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-black/5">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors duration-200 group focus-ring",
                collapsed && "justify-center px-0",
                active ? "text-[var(--color-gold-deep)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              title={collapsed ? t(item.label as TranslationKey) : undefined}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] border border-[color-mix(in_srgb,var(--color-gold)_25%,transparent)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon size={18} className="relative shrink-0" strokeWidth={active ? 2.3 : 2} />
              {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    className="relative whitespace-nowrap overflow-hidden"
                  >
                    {t(item.label as TranslationKey)}
                  </motion.span>
                )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2.5 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-colors"
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronsLeft size={17} />
          </motion.span>
          {!collapsed && t("layout.sidebarCollapse")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:block shrink-0 h-dvh sticky top-0 border-r border-[var(--border-soft)] bg-[var(--bg-sidebar)] backdrop-blur-xl"
      >
        {content}
      </motion.aside>

      {/* Mobile drawer */}
      {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] glass-solid lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
    </>
  );
}
