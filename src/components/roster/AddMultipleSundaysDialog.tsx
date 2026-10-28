"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { formatDate } from "@/lib/utils";

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

/** The dates a start date + number of weeks expands to (one per week, same weekday). */
function weeklyDates(start: string, weeks: number): string[] {
  const [y, m, d] = start.split("-").map(Number);
  return Array.from({ length: weeks }, (_, i) => toIsoDate(new Date(y, m - 1, d + i * 7)));
}

export function AddMultipleSundaysDialog({
  open,
  onClose,
  initialStart,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  /** Suggested first date — the Sunday after the last roster entry, so nothing is added twice. */
  initialStart?: string;
  /** Called with the dates that were created (and how many were skipped because they already exist). */
  onAdded: (result: { dates: string[]; skipped: number }) => void;
}) {
  const { t, language } = useLanguage();
  const [start, setStart] = useState(() => initialStart ?? toIsoDate(nextSunday(new Date())));
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planned = start ? weeklyDates(start, weeks) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || weeks < 1) return;
    setSubmitting(true);
    setError(null);
    const created: string[] = [];
    try {
      // Dates that already have a roster entry are skipped, so running this twice never doubles up.
      const taken = new Set(useAppStore.getState().rosterEntries.map((r) => r.date));
      const todo = planned.filter((date) => !taken.has(date));
      if (todo.length === 0) {
        setError(t("roster.allDatesExist"));
        return;
      }
      for (const date of todo) {
        await useAppStore.getState().createRosterEntry({
          date,
          sundaySchoolUserIds: [],
          teenClubUserIds: [],
          theme: "",
          notes: "",
          serviceType: "",
          preacher: "",
          liturgy: "",
          musicalAccompaniment: "",
        });
        created.push(date);
      }
      onAdded({ dates: created, skipped: planned.length - created.length });
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
      // Rows created before the failure are real — tell the page so it can show them.
      if (created.length > 0) onAdded({ dates: created, skipped: planned.length - created.length });
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
        {planned.length > 0 && (
          <p className="text-[12px] text-[var(--text-secondary)]">
            {planned.length} × {t("roster.addsRows")}: {formatDate(planned[0], undefined, language)}
            {planned.length > 1 && <> – {formatDate(planned[planned.length - 1], undefined, language)}</>}
          </p>
        )}
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button type="submit" className="w-full" loading={submitting} disabled={!start || submitting}>
          {t("roster.addMultipleSundays")}
        </Button>
      </form>
    </Modal>
  );
}
