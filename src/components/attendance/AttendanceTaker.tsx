"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, CircleCheck, UserPlus, ClipboardCheck, Search, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { AddChildModal } from "@/components/children/AddChildModal";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { apiGet, apiPut } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import { addDays, MAX_BACKFILL_DAYS, todayInAmsterdam } from "@/lib/attendance-stats";
import { getUser, useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus, Child } from "@/lib/types";

type Step = "select" | "addChild";

interface SavedSummary {
  date: string;
  present: number;
  absent: number;
  excused: number;
  visitors: number;
}

/** Step 2: tick who was there on `date`. Mounted only after the date has been chosen. */
function Register({ classId, date, pupils, onClose, onSaved }: { classId: string; date: string; pupils: Child[]; onClose: () => void; onSaved: (summary: SavedSummary) => void }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const classes = useAppStore((s) => s.classes);
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<AttendanceRecord | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visitors, setVisitors] = useState(0);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ record: AttendanceRecord | null }>(`/api/attendance?classId=${encodeURIComponent(classId)}&date=${date}`)
      .then(({ record }) => {
        if (cancelled) return;
        setExisting(record);
        // Start from what was saved for this day (or from nobody for a new register).
        setSelected(new Set(pupils.filter((c) => record?.marks[c.id] === "present").map((c) => c.id)));
        setVisitors(record?.visitors ?? 0);
        setNote(record?.note ?? "");
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err, language));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // The register is fetched once per (class, date).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const schoolClass = useMemo(() => classes.filter((c) => c.id === classId), [classes, classId]);
  const filteredPupils = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? pupils.filter((c) => c.name.toLowerCase().includes(q)) : pupils;
  }, [pupils, search]);

  function toggle(childId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Everyone who wasn't selected is absent — except a child who was already saved as excused for this day.
      const marks: Record<string, AttendanceStatus> = {};
      for (const child of pupils) {
        if (selected.has(child.id)) marks[child.id] = "present";
        else marks[child.id] = existing?.marks[child.id] === "excused" ? "excused" : "absent";
      }
      const res = await apiPut<{ record: AttendanceRecord }>("/api/attendance", { classId, date, marks, visitors, note });
      const values = Object.values(res.record.marks);
      onSaved({
        date,
        present: values.filter((m) => m === "present").length,
        absent: values.filter((m) => m === "absent").length,
        excused: values.filter((m) => m === "excused").length,
        visitors: res.record.visitors,
      });
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSaving(false);
    }
  }

  const savedBy = existing ? getUser(existing.updatedBy ?? existing.takenBy)?.name : undefined;
  const dateLabel = formatDate(date, { weekday: "long", day: "numeric", month: "long" }, language);

  return (
    <div>
      <Modal open={step === "select"} onClose={onClose} title={`${t("attendance.modalTitle")} — ${dateLabel}`} size="md">
        {!loaded ? (
          <p className="text-sm text-[var(--text-secondary)] py-6">{t("attendance.loading")}</p>
        ) : (
        <div className="space-y-4">
          {existing && (
            <p className="text-[12.5px] font-medium rounded-xl px-3.5 py-2.5 bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold-deep)]">
              {t("attendance.existingNotice")} {savedBy ?? "—"}. {t("attendance.existingNoticeEnd")}
            </p>
          )}
          <p className="text-[13px] text-[var(--text-secondary)]">{t("attendance.modalHint")}</p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold">
              <span className="text-[var(--color-sage-deep)]">
                {selected.size} / {pupils.length}
              </span>{" "}
              {t("attendance.summaryPresent")}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set(pupils.map((c) => c.id)))} disabled={pupils.length === 0}>
                <Check size={13} /> {t("attendance.selectAll")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                {t("attendance.clearAll")}
              </Button>
            </div>
          </div>

          {pupils.length > 0 && (
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("attendance.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring"
              />
            </div>
          )}

          {pupils.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-2">{t("attendance.noChildren")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-softer)] rounded-2xl border border-[var(--border-soft)] max-h-[min(22rem,40vh)] overflow-y-auto">
              {filteredPupils.map((child) => {
                const on = selected.has(child.id);
                return (
                  <li key={child.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(child.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors focus-ring",
                        on ? "bg-[color-mix(in_srgb,var(--color-sage-deep)_10%,transparent)]" : "hover:bg-black/[0.04]"
                      )}
                    >
                      <span className="text-sm font-semibold flex-1 truncate">{child.name}</span>
                      <span
                        className={cn(
                          "w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                          on ? "bg-[var(--color-sage-deep)] border-[var(--color-sage-deep)] text-white" : "border-[var(--border-soft)]"
                        )}
                      >
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredPupils.length === 0 && <li className="px-3.5 py-3 text-sm text-[var(--text-secondary)]">{t("attendance.noMatch")}</li>}
            </ul>
          )}

          <Button variant="outline" className="w-full" onClick={() => setStep("addChild")}>
            <UserPlus size={15} /> {t("attendance.addChild")}
          </Button>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t("attendance.visitorsLabel")}</p>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setVisitors((v) => Math.max(0, v - 1))} aria-label="-" disabled={visitors === 0}>
                  <Minus size={14} />
                </Button>
                <span className="w-8 text-center font-semibold tabular-nums">{visitors}</span>
                <Button size="icon" variant="outline" onClick={() => setVisitors((v) => Math.min(99, v + 1))} aria-label="+">
                  <Plus size={14} />
                </Button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("attendance.visitorsHint")}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("attendance.noteLabel")}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t("attendance.notePlaceholder")}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <Button className="w-full" onClick={save} loading={saving} disabled={saving || pupils.length === 0}>
            {saving ? t("attendance.saving") : existing ? t("attendance.update") : t("attendance.save")}
          </Button>
        </div>
        )}
      </Modal>

      {/* The picker is hidden while this is open, so only one dialog is up at a time; the ticks are kept. */}
      <AddChildModal
        open={step === "addChild"}
        onClose={() => setStep("select")}
        classes={schoolClass}
        defaultClassId={classId}
        defaultTeacherId={user?.role === "teacher" ? user.id : undefined}
        onCreated={(child) => setSelected((prev) => new Set(prev).add(child.id))}
      />
    </div>
  );
}

/** Step 1: choose the date the attendance is for. Nothing else is shown until this is done. */
function DateStep({ initialDate, onCancel, onContinue }: { initialDate: string; onCancel: () => void; onContinue: (date: string) => void }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const today = todayInAmsterdam();
  const isAdmin = user?.role === "admin";
  const min = isAdmin ? undefined : addDays(today, -MAX_BACKFILL_DAYS);
  const [date, setDate] = useState(initialDate);
  const valid = !!date && date <= today && (!min || date >= min);

  return (
    <Modal open onClose={onCancel} title={t("attendance.dateStepTitle")} size="sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onContinue(date);
        }}
      >
        <p className="text-[13px] text-[var(--text-secondary)]">{t("attendance.dateStepHint")}</p>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("attendance.dateLabel")}</label>
          <input
            type="date"
            autoFocus
            value={date}
            max={today}
            min={min}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-base px-3.5 py-3 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
          />
          {valid && <p className="text-[13px] font-semibold mt-2 flex items-center gap-1.5"><CalendarDays size={14} className="text-[var(--color-gold-deep)]" /> {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, language)}</p>}
          {!isAdmin && <p className="text-[11px] text-[var(--text-secondary)] mt-2">{t("attendance.backfillHint")}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!valid}>
          {t("attendance.continueButton")} <ArrowRight size={16} />
        </Button>
      </form>
    </Modal>
  );
}

/**
 * The attendance card. One clear button starts it: first choose the date, then tick who was there
 * (everyone not ticked is absent) and save. The overview below lists every saved Sunday.
 */
export function AttendanceTaker({ classId, pupils }: { classId: string; pupils: Child[] }) {
  const { t, language } = useLanguage();
  const today = todayInAmsterdam();
  const [flow, setFlow] = useState<{ date: string; stage: "date" | "pick" } | null>(null);
  const [lastSaved, setLastSaved] = useState<SavedSummary | null>(null);
  const [version, setVersion] = useState(0);
  const registerRef = useRef<HTMLDivElement>(null);
  const className = useAppStore((s) => s.classes.find((c) => c.id === classId)?.name ?? "");

  function start() {
    setLastSaved(null);
    setFlow({ date: today, stage: "date" });
  }

  /** From the overview: a date was clicked, so it is already chosen — go straight to the checklist. */
  function openDate(next: string) {
    setLastSaved(null);
    setFlow({ date: next, stage: "pick" });
  }

  return (
    <div className="space-y-6">
      <div ref={registerRef} className="scroll-mt-24">
        <Card hover={false} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_18%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)]">
                <ClipboardCheck size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">{t("attendance.heading")}</h2>
                <p className="text-[13px] text-[var(--text-secondary)]">{t("attendance.subtitle")}</p>
              </div>
            </div>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto shrink-0 shadow-md" onClick={start}>
              <ClipboardCheck size={18} /> {t("attendance.startButton")}
            </Button>
          </div>

          <ol className="mt-5 grid sm:grid-cols-3 gap-2.5 text-[12.5px]">
            {[t("attendance.step1"), t("attendance.step2"), t("attendance.step3")].map((label, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-gold)] text-[#151a2d] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ol>

          {lastSaved && (
            <p className="mt-4 text-[13px] font-semibold text-[var(--color-sage-deep)] flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <CircleCheck size={15} /> {t("attendance.saved")}
              <span className="font-medium text-[var(--text-secondary)]">
                {formatDate(lastSaved.date, { weekday: "long", day: "numeric", month: "long" }, language)}: {lastSaved.present} {t("attendance.summaryPresent")}, {lastSaved.absent} {t("attendance.summaryAbsent")}
                {lastSaved.excused > 0 && `, ${lastSaved.excused} ${t("attendance.summaryExcused")}`}
                {lastSaved.visitors > 0 && `, ${lastSaved.visitors} ${t("attendance.visitorsShort")}`}
              </span>
            </p>
          )}
        </Card>
      </div>

      {flow?.stage === "date" && <DateStep initialDate={flow.date} onCancel={() => setFlow(null)} onContinue={(date) => setFlow({ date, stage: "pick" })} />}
      {flow?.stage === "pick" && (
        <Register
          key={`${classId}|${flow.date}`}
          classId={classId}
          date={flow.date}
          pupils={pupils}
          onClose={() => setFlow(null)}
          onSaved={(summary) => {
            setFlow(null);
            setLastSaved(summary);
            setVersion((v) => v + 1);
          }}
        />
      )}

      <AttendanceHistory classId={classId} className={className} pupils={pupils} version={version} onOpenDate={openDate} />
    </div>
  );
}
