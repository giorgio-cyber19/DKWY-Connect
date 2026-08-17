"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, BookPlus, MessageSquarePlus, CalendarPlus, UploadCloud } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function FAB() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actions = [
    { label: t("layout.fabLessonPlan"), icon: BookPlus, href: "/lessons/new" },
    { label: t("layout.fabUpdatePost"), icon: MessageSquarePlus, href: "/updates" },
    { label: t("layout.fabEvent"), icon: CalendarPlus, href: "/calendar" },
    { label: t("common.upload"), icon: UploadCloud, href: "/media" },
  ];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40 sm:hidden">
      {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-16 right-0 flex flex-col items-end gap-2.5 mb-2">
            {actions.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-full glass-solid card-shadow text-xs font-semibold"
                >
                  {a.label}
                  <span className="w-7 h-7 rounded-full bg-[var(--color-gold)] text-white flex items-center justify-center">
                    <a.icon size={13} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: open ? 45 : 0 }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-gold-deep)] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(201,154,63,0.6)]"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
}
