"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";

function nextSunday(from: Date): Date {
  const d = new Date(from);
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + (d.getDay() === 0 ? 0 : daysUntilSunday));
  return d;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

export function AddMultipleSundaysDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [start, setStart] = useState(() => toIsoDate(nextSunday(new Date())));
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || weeks < 1) return;
    setSubmitting(true);
    try {
      const [y, m, d] = start.split("-").map(Number);
      for (let i = 0; i < weeks; i++) {
        const date = new Date(y, m - 1, d + i * 7);
        await useAppStore.getState().createRosterEntry({
          date: toIsoDate(date),
          sundaySchoolUserIds: [],
          teenClubUserIds: [],
          theme: "",
          notes: "",
          serviceType: "",
          preacher: "",
          liturgy: "",
          musicalAccompaniment: "",
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("roster.addMultipleSundays")} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("roster.startDate")}</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("roster.numberOfWeeks")}</label>
          <input
            type="number"
            min={1}
            max={52}
            value={weeks}
            onChange={(e) => setWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </div>
        <Button type="submit" className="w-full" loading={submitting} disabled={!start || submitting}>
          {t("roster.addMultipleSundays")}
        </Button>
      </form>
    </Modal>
  );
}
