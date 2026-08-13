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
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
    >
      <div>
        {eyebrow && <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--color-gold-deep)] mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-[2.25rem] font-semibold leading-tight">{title}</h1>
        {description && <p className="text-[var(--text-secondary)] mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}
