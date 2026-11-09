"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, FileDown, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContextMenu, useContextMenu } from "@/components/ui/ContextMenu";
import { useLanguage } from "@/lib/language-context";
import { apiGet } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import { addDays, todayInAmsterdam } from "@/lib/attendance-stats";
import { buildReport, sortRecords } from "@/lib/attendance-report";
import { downloadAttendancePdf, type PdfLabels } from "@/lib/attendance-pdf";
import { getUser } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { AttendanceRecord, Child } from "@/lib/types";

const WINDOWS = [8, 16, 0] as const; // 0 = every recorded Sunday

const solid = "bg-[var(--bg-elevated-solid)]";

/** Every saved Sunday of a class as a table — children down the side, Sundays across — with PDF export. */
export function AttendanceHistory({
  classId,
  className,
  pupils,
  version,
  onOpenDate,
}: {
  classId: string;
  className: string;
  pupils: Child[];
  /** Changes whenever a register was saved, so the table reloads. */
  version: number;
  onOpenDate: (date: string) => void;
}) {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState<number>(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const menu = useContextMenu();

  useEffect(() => {
    let cancelled = false;
    const today = todayInAmsterdam();
    apiGet<{ records: AttendanceRecord[] }>(`/api/attendance?classId=${encodeURIComponent(classId)}&from=${addDays(today, -365)}&to=${today}`)
      .then((d) => {
        if (cancelled) return;
        setRecords(d.records);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err, language));
        setRecords((prev) => prev ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, version, language]);

  const all = useMemo(() => sortRecords(records ?? []), [records]);
  const shown = useMemo(() => (windowSize > 0 ? all.slice(-windowSize) : all), [all, windowSize]);
  const report = useMemo(() => buildReport(shown, pupils), [shown, pupils]);

  if (records === null) return null;

  const fmtShort = (iso: string) => formatDate(iso, { day: "numeric", month: "short", year: undefined }, language);
  const fmtLong = (iso: string) => formatDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, language);

  async function makePdf(dates: string[]) {
    const chosen = all.filter((r) => dates.includes(r.date));
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const labels: PdfLabels = {
        title: t("attendance.pdfTitle"),
        classLabel: t("attendance.classLabel"),
        periodLabel: t("attendance.pdfPeriod"),
        generatedOn: t("attendance.pdfGenerated"),
        page: t("attendance.pdfPage"),
        of: t("attendance.pdfOf"),
        name: t("attendance.reportName"),
        present: t("attendance.present"),
        presentShort: t("attendance.reportCount"),
        absent: t("attendance.absent"),
        excused: t("attendance.excused"),
        excusedLetter: t("attendance.excusedLetter"),
        visitors: t("attendance.visitorsLabel"),
        notRecorded: t("attendance.reportNotRecorded"),
        notes: t("attendance.pdfNotes"),
        recordedBy: t("attendance.pdfRecordedBy"),
        sundays: t("attendance.reportSundays"),
      };
      await downloadAttendancePdf({
        className,
        records: chosen,
        pupils,
        labels,
        formatDate: (iso, style) => (style === "short" ? fmtShort(iso) : fmtLong(iso)),
        userName: (id) => (id ? getUser(id)?.name : undefined),
        generatedOn: formatDate(todayInAmsterdam(), { day: "numeric", month: "long", year: "numeric" }, language),
      });
    } catch {
      setError(t("attendance.pdfFailed"));
    } finally {
      setBusy(false);
    }
  }

  function toggle(date: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const shownDates = shown.map((r) => r.date);
  const allShownSelected = shownDates.length > 0 && shownDates.every((d) => selected.has(d));
  const selectedCount = all.filter((r) => selected.has(r.date)).length;

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("attendance.reportHeading")}</h2>
          <p className="text-[12.5px] text-[var(--text-secondary)]">
            {all.length} {t("attendance.reportSundays")} · {t("attendance.reportSubtitle")}
          </p>
        </div>
        {all.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {all.length > WINDOWS[0] && (
              <select
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                aria-label={t("attendance.reportShowing")}
                className="text-sm px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring"
              >
                {WINDOWS.map((w) => (
                  <option key={w} value={w}>
                    {w === 0 ? `${t("attendance.reportAll")} (${all.length})` : `${t("attendance.reportLast")} ${w}`}
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              loading={busy}
              disabled={busy}
              onClick={(e) =>
                menu.open(e, [
                  { label: `${t("attendance.pdfAll")} (${all.length})`, icon: <FileDown size={15} />, onClick: () => makePdf(all.map((r) => r.date)) },
                  { label: `${t("attendance.pdfSelected")} (${selectedCount})`, icon: <FileDown size={15} />, onClick: () => makePdf([...selected]), disabled: selectedCount === 0 },
                ])
              }
            >
              <FileDown size={14} /> {t("attendance.pdfButton")}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium mb-3">{error}</p>}

      {all.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("attendance.reportNoneTitle")} description={t("attendance.reportNoneDescription")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
            <table className="min-w-full border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  <th className={cn("sticky left-0 z-10 text-left px-3 py-2 font-semibold text-[var(--text-secondary)] border-b border-[var(--border-soft)] min-w-[9.5rem]", solid)}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allShownSelected}
                        onChange={() => setSelected((prev) => (allShownSelected ? new Set([...prev].filter((d) => !shownDates.includes(d))) : new Set([...prev, ...shownDates])))}
                        aria-label={t("attendance.selectAllDates")}
                        className="accent-[var(--color-sage-deep)]"
                      />
                      {t("attendance.reportName")}
                    </label>
                  </th>
                  {shown.map((r) => (
                    <th key={r.date} className={cn("px-1 py-1.5 min-w-[3.75rem] text-center align-bottom border-b border-[var(--border-soft)] font-semibold", selected.has(r.date) && "bg-[color-mix(in_srgb,var(--color-blue)_9%,transparent)]")}>
                      <button
                        type="button"
                        onClick={() => onOpenDate(r.date)}
                        title={fmtLong(r.date)}
                        className="block w-full leading-tight hover:underline text-[var(--text-primary)] focus-ring rounded"
                      >
                        {fmtShort(r.date)}
                        <span className="block text-[10px] font-normal text-[var(--text-secondary)]">{r.date.slice(0, 4)}</span>
                      </button>
                      <span className="flex items-center justify-center gap-1.5 mt-1">
                        <input
                          type="checkbox"
                          checked={selected.has(r.date)}
                          onChange={() => toggle(r.date)}
                          aria-label={`${t("attendance.selectDate")} ${fmtShort(r.date)}`}
                          className="accent-[var(--color-sage-deep)]"
                        />
                        <button
                          type="button"
                          onClick={() => makePdf([r.date])}
                          disabled={busy}
                          aria-label={`${t("attendance.pdfOne")} ${fmtShort(r.date)}`}
                          title={t("attendance.pdfOne")}
                          className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring disabled:opacity-40"
                        >
                          <FileDown size={14} />
                        </button>
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-[var(--text-secondary)] font-semibold border-b border-l border-[var(--border-soft)] min-w-[3.5rem]">{t("attendance.reportCount")}</th>
                  <th className="px-2 py-2 text-center text-[var(--text-secondary)] font-semibold border-b border-[var(--border-soft)] min-w-[3rem]">%</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.child.id} className="group">
                    <th scope="row" className={cn("sticky left-0 z-10 text-left px-3 py-1.5 font-semibold border-b border-[var(--border-softer)] whitespace-nowrap max-w-[12rem] truncate", solid)}>
                      {row.child.name}
                    </th>
                    {row.marks.map((m, i) => (
                      <td
                        key={shown[i].date}
                        className={cn(
                          "text-center px-1 py-1.5 border-b border-[var(--border-softer)]",
                          m === "present" && "bg-[color-mix(in_srgb,var(--color-sage-deep)_10%,transparent)]",
                          m === "absent" && "bg-[color-mix(in_srgb,#ef4444_10%,transparent)]",
                          m === "excused" && "bg-[color-mix(in_srgb,var(--color-gold-deep)_14%,transparent)]"
                        )}
                      >
                        {m === "present" && <Check size={15} strokeWidth={3} className="inline text-[var(--color-sage-deep)]" aria-label={t("attendance.present")} />}
                        {m === "absent" && <X size={15} strokeWidth={3} className="inline text-red-500" aria-label={t("attendance.absent")} />}
                        {m === "excused" && <span className="font-bold text-[var(--color-gold-deep)]" title={t("attendance.excused")}>{t("attendance.excusedLetter")}</span>}
                        {m === null && <span className="text-[var(--color-ink-faint)]" title={t("attendance.reportNotRecorded")}>·</span>}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 border-b border-l border-[var(--border-softer)] tabular-nums text-[var(--text-secondary)]">
                      {row.present}/{row.counted}
                    </td>
                    <td className="text-center px-2 py-1.5 border-b border-[var(--border-softer)] tabular-nums font-semibold">{row.percent === null ? "–" : `${row.percent}%`}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={cn("sticky left-0 z-10 text-left px-3 py-2 font-semibold text-[var(--color-sage-deep)]", solid)}>{t("attendance.present")}</th>
                  {report.totals.map((tot, i) => (
                    <td key={shown[i].date} className="text-center px-1 py-2 font-semibold tabular-nums text-[var(--color-sage-deep)]">
                      {tot.present}
                    </td>
                  ))}
                  <td colSpan={2} />
                </tr>
                <tr>
                  <th scope="row" className={cn("sticky left-0 z-10 text-left px-3 py-1.5 font-semibold text-[var(--text-secondary)]", solid)}>{t("attendance.visitorsLabel")}</th>
                  {report.totals.map((tot, i) => (
                    <td key={shown[i].date} className="text-center px-1 py-1.5 tabular-nums text-[var(--text-secondary)]">
                      {tot.visitors}
                    </td>
                  ))}
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3 text-[11.5px] text-[var(--text-secondary)]">
            <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
              <span className="inline-flex items-center gap-1"><Check size={13} strokeWidth={3} className="text-[var(--color-sage-deep)]" /> {t("attendance.present")}</span>
              <span className="inline-flex items-center gap-1"><X size={13} strokeWidth={3} className="text-red-500" /> {t("attendance.absent")}</span>
              <span className="inline-flex items-center gap-1"><b className="text-[var(--color-gold-deep)]">{t("attendance.excusedLetter")}</b> {t("attendance.excused")}</span>
              <span className="inline-flex items-center gap-1"><b>·</b> {t("attendance.reportNotRecorded")}</span>
            </p>
            <p>
              {shown.length < all.length && `${t("attendance.reportShowingOf").replace("{n}", String(shown.length)).replace("{total}", String(all.length))} · `}
              {selectedCount > 0 ? (
                <>
                  {selectedCount} {t("attendance.reportSelected")} ·{" "}
                  <button type="button" onClick={() => setSelected(new Set())} className="underline hover:text-[var(--text-primary)] focus-ring rounded">
                    {t("attendance.clearAll")}
                  </button>
                </>
              ) : (
                t("attendance.pdfSelectHint")
              )}
            </p>
          </div>
        </>
      )}
      {menu.state && <ContextMenu x={menu.state.x} y={menu.state.y} items={menu.state.items} onClose={menu.close} />}
    </Card>
  );
}
