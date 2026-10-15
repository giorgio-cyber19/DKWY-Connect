"use client";

import { useEffect, useMemo, useState } from "react";
import { TriangleAlert, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/language-context";
import { apiGet } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import { summarizeChild } from "@/lib/attendance-stats";
import { formatDate, cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

const DOT: Record<AttendanceStatus, string> = {
  present: "bg-[var(--color-sage-deep)]",
  absent: "bg-red-500",
  excused: "bg-[var(--color-gold-deep)]",
};
const TONE: Record<AttendanceStatus, "sage" | "danger" | "gold"> = { present: "sage", absent: "danger", excused: "gold" };

export function ChildAttendance({ childId }: { childId: string }) {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ records: AttendanceRecord[] }>(`/api/attendance?childId=${encodeURIComponent(childId)}&weeks=52`)
      .then((d) => {
        if (!cancelled) setRecords(d.records);
      })
      .catch((err) => {
        if (!cancelled) setError(translateApiError(err, language));
      });
    return () => {
      cancelled = true;
    };
  }, [childId, language]);

  const summary = useMemo(() => (records ? summarizeChild(records, childId) : null), [records, childId]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!summary) return <p className="text-sm text-[var(--text-secondary)]">{t("attendance.loading")}</p>;
  if (summary.total === 0) {
    return <EmptyState icon={CalendarCheck} title={t("attendance.noHistoryTitle")} description={t("attendance.noHistoryDescription")} />;
  }

  const strip = [...summary.sessions].slice(0, 16).reverse(); // oldest → newest, left to right

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hover={false} className="p-4">
          <p className="font-display text-2xl font-semibold">{summary.rate}%</p>
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("attendance.rateLabel")}</p>
        </Card>
        <Card hover={false} className="p-4">
          <p className="font-display text-2xl font-semibold text-[var(--color-sage-deep)]">{summary.present}</p>
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("attendance.present")}</p>
        </Card>
        <Card hover={false} className="p-4">
          <p className="font-display text-2xl font-semibold text-red-500">{summary.absent}</p>
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("attendance.absent")}</p>
        </Card>
        <Card hover={false} className="p-4">
          <p className="font-display text-2xl font-semibold text-[var(--color-gold-deep)]">{summary.excused}</p>
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("attendance.excused")}</p>
        </Card>
      </div>

      {summary.missedInARow >= 3 && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] text-[13px]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[var(--color-gold-deep)]" />
          <span>
            <span className="font-semibold">
              {summary.missedInARow} {t("attendance.missedInARow")}.
            </span>{" "}
            {t("attendance.missedNote")}
          </span>
        </div>
      )}

      <div>
        <h3 className="font-display font-semibold text-[15px] mb-3">{t("attendance.recentHeading")}</h3>
        <div className="flex items-center gap-1.5 mb-4" aria-hidden>
          {strip.map((s) => (
            <span key={`${s.classId}-${s.date}`} title={`${formatDate(s.date, undefined, language)} · ${t(`attendance.${s.status}`)}`} className={cn("w-3.5 h-3.5 rounded-full", DOT[s.status])} />
          ))}
        </div>
        <ul className="divide-y divide-[var(--border-softer)] rounded-2xl border border-[var(--border-soft)]">
          {summary.sessions.slice(0, 12).map((s) => (
            <li key={`${s.classId}-${s.date}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{formatDate(s.date, { weekday: "long" }, language)}</span>
              <Badge tone={TONE[s.status]}>{t(`attendance.${s.status}`)}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
