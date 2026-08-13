"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-2xl glass overflow-x-auto no-scrollbar", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-ring flex items-center gap-1.5",
            active === tab.id ? "text-[#3a2a0a]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {active === tab.id && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 rounded-xl bg-gradient-to-b from-[var(--color-gold-light)] to-[var(--color-gold)]"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
