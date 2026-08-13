"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Search, Plus, LogOut, Settings, ChevronDown, BookPlus, MessageSquarePlus, CalendarPlus, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationCenter } from "./NotificationCenter";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar({ onOpenMobileSidebar, onOpenSearch }: { onOpenMobileSidebar: () => void; onOpenSearch: () => void }) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const quickActions = [
    { label: "New Lesson Plan", icon: BookPlus, href: "/lessons/new" },
    { label: "New Update Post", icon: MessageSquarePlus, href: "/updates" },
    { label: "New Calendar Event", icon: CalendarPlus, href: "/calendar" },
    { label: "Upload Media", icon: UploadCloud, href: "/media" },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-[var(--border-soft)] bg-[var(--bg-elevated)] backdrop-blur-xl">
      <button onClick={onOpenMobileSidebar} className="lg:hidden p-2 rounded-xl hover:bg-black/5">
        <Menu size={19} />
      </button>

      <button
        onClick={onOpenSearch}
        className="hidden sm:flex items-center gap-2.5 flex-1 max-w-sm px-3.5 py-2 rounded-xl border border-[var(--border-soft)] text-[var(--text-secondary)] text-sm hover:border-[var(--color-gold-light)] transition-colors"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search everything…</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-soft)]">⌘K</kbd>
      </button>

      <button onClick={onOpenSearch} className="sm:hidden ml-auto p-2 rounded-xl hover:bg-black/5">
        <Search size={18} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickOpen((o) => !o)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-[var(--color-gold-light)] to-[var(--color-gold)] text-[#3a2a0a] text-sm font-semibold shadow-[0_3px_10px_-2px_rgba(201,154,63,0.5)] hover:shadow-[0_4px_14px_-2px_rgba(201,154,63,0.6)] transition-shadow"
          >
            <Plus size={15} />
            New
            <ChevronDown size={13} className={quickOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {quickOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 glass-solid rounded-2xl card-shadow-hover overflow-hidden z-50"
              >
                {quickActions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={() => setQuickOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium hover:bg-black/[0.04] transition-colors"
                  >
                    <a.icon size={16} className="text-[var(--color-gold-deep)]" />
                    {a.label}
                  </Link>
                ))}
              </motion.div>
            )}
        </div>

        <ThemeToggle />
        <NotificationCenter />

        <div className="relative ml-1" ref={userRef}>
          <button onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-black/5 transition-colors">
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            <ChevronDown size={13} className="hidden sm:block text-[var(--text-secondary)]" />
          </button>
          {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-60 glass-solid rounded-2xl card-shadow-hover overflow-hidden z-50"
              >
                <div className="px-4 py-3.5 border-b border-[var(--border-soft)]">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[var(--color-gold-deep)]">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium hover:bg-black/[0.04] transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-red-500 hover:bg-red-500/5 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </motion.div>
            )}
        </div>
      </div>
    </header>
  );
}
