"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, BookOpen, Users, MessageCircle, CalendarDays, HeartHandshake, Megaphone } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { timeAgo, cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const iconMap: Record<Notification["type"], typeof BookOpen> = {
  lesson: BookOpen,
  portfolio: Users,
  comment: MessageCircle,
  event: CalendarDays,
  prayer: HeartHandshake,
  admin: Megaphone,
};

export function NotificationCenter() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const items = useAppStore((s) => s.notifications);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors focus-ring"
        aria-label={t("layout.notifications")}
      >
        <Bell size={19} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--color-gold-deep)] text-white text-[9px] font-bold flex items-center justify-center"
          >
            {unread}
          </motion.span>
        )}
      </button>

      {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-y-auto glass-solid rounded-2xl card-shadow-hover z-50"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-soft)]">
              <h4 className="font-display font-semibold text-sm">{t("layout.notifications")}</h4>
              {unread > 0 && (
                <button
                  onClick={() => useAppStore.getState().markAllNotificationsRead()}
                  className="text-[11px] font-semibold text-[var(--color-blue-deep)] hover:underline"
                >
                  {t("layout.markAllRead")}
                </button>
              )}
            </div>
            {items.length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-10">{t("layout.noNotificationsYet")}</p>}
            <div className="divide-y divide-[var(--border-softer)]">
              {items.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      useAppStore.getState().markNotificationRead(n.id);
                      setOpen(false);
                    }}
                    className={cn("flex items-start gap-3 px-4 py-3.5 hover:bg-black/[0.03] transition-colors", !n.read && "bg-[color-mix(in_srgb,var(--color-gold)_6%,transparent)]")}
                  >
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-blue)_14%,transparent)] text-[var(--color-blue-deep)]">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug">{n.title}</p>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2">{n.description}</p>
                      <p className="text-[10.5px] text-[var(--text-secondary)] mt-1">{timeAgo(n.date)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--color-gold)] mt-1.5 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
    </div>
  );
}
