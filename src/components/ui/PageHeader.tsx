"use client";

import { motion } from "framer-motion";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-8"
    >
      <div>
        {eyebrow && <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--color-gold-deep)] mb-1.5 sm:mb-2">{eyebrow}</p>}
        <h1 className="font-display text-2xl sm:text-[2.25rem] font-semibold leading-tight">{title}</h1>
        {description && <p className="text-[var(--text-secondary)] text-sm sm:text-base mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </motion.div>
  );
}
