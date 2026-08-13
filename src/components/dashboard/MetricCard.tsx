"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StaggerItem } from "@/components/ui/Stagger";

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  color: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <StaggerItem>
      <Card className="p-5 flex items-center gap-4" hover>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
        >
          <Icon size={22} />
        </div>
        <div>
          <p className="font-display text-2xl font-semibold leading-none">{display}</p>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-1.5">{label}</p>
          {trend && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-[11px] font-semibold text-[var(--color-sage-deep)] mt-0.5">
              {trend}
            </motion.p>
          )}
        </div>
      </Card>
    </StaggerItem>
  );
}
