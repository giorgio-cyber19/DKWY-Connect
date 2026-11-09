"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, CircleCheck, UserPlus, ClipboardCheck, Search } from "lucide-react";
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

type Step = "closed" | "select" | "addChild";

function Chips({ children, tone }: { children: Child[]; tone: "present" | "absent" | "excused" }) {
  const styles = {
    present: "bg-[color-mix(in_srgb,var(--color-sage-deep)_14%,transparent)] text-[var(--color-sage-deep)]",
    absent: "bg-[color-mix(in_srgb,#ef4444_14%,transparent)] text-red-500",
    excused: "bg-[color-mix(in_srgb,var(--color-gold-deep)_16%,transparent)] text-[var(--color-gold-deep)]",
  };
  return (
    <ul className="flex flex-wrap gap-1.5">
      {children.map((c) => (
        <li key={c.id} className={cn("px-2.5 py-1 rounded-full text-[12.5px] font-semibold", styles[tone])}>
          {c.name}
        </li>
      ))}
    </ul>
  );
}

function Register({ classId, date, pupils, onSaved }: { classId: string; date: string; pupils: Child[]; onSaved: () => void }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const classes = useAppStore((s) => s.classes);
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<AttendanceRecord | null>(null);
  const [step, setStep] = useState<Step>("closed");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visitors, setVisitors] = useState(0);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ record: AttendanceRecord | null }>(`/api/attendance?classId=${encodeURIComponent(classId)}&date=${date}`)
      .then(({ record }) => {
        if (cancelled) return;
        setExisting(record);
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

  if (!loaded) return <p className="text-sm text-[var(--text-secondary)] py-6">{t("attendance.loading")}</p>;

  /** Opens the picker, starting from what was saved (or from nobody for a new register). */
  function openPicker() {
    setSelected(new Set(pupils.filter((c) => existing?.marks[c.id] === "present").map((c) => c.id)));
    setVisitors(existing?.visitors ?? 0);
    setNote(existing?.note ?? "");
    setSearch("");
    setError(null);
    setJustSaved(false);
    setStep("select");
  }

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
      setExisting(res.record);
      setJustSaved(true);
      setStep("closed");
      onSaved();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSaving(false);
    }
  }

  const marks = existing?.marks ?? {};
  const presentKids = pupils.filter((c) => marks[c.id] === "present");
  const absentKids = pupils.filter((c) => marks[c.id] === "absent");
  const excusedKids = pupils.filter((c) => marks[c.id] === "excused");
  const savedBy = existing ? getUser(existing.updatedBy ?? existing.takenBy)?.name : undefined;
  const dateLabel = formatDate(date, { weekday: "long", day: "numeric", month: "long" }, language);

  return (
    <div className="space-y-4">
      {!existing ? (
        <div className="flex flex-col items-center text-center gap-3 py-6 rounded-2xl border border-dashed border-[var(--border-soft)]">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)]">
            <ClipboardCheck size={20} />
          </div>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">{t("attendance.noRegisterYet")}</p>
          <Button onClick={openPicker}>
            <Plus size={15} /> {t("attendance.addRegister")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-[var(--color-sage-deep)]">
                {presentKids.length} {t("attendance.summaryPresent")}
              </span>
              <span className="text-red-500">
                {absentKids.length} {t("attendance.summaryAbsent")}
              </span>
              {excusedKids.length > 0 && (
                <span className="text-[var(--color-gold-deep)]">
                  {excusedKids.length} {t("attendance.summaryExcused")}
                </span>
              )}
              {existing.visitors > 0 && (
                <span className="text-[var(--text-secondary)]">
                  {existing.visitors} {t("attendance.visitorsShort")}
                </span>
              )}
            </p>
            <Button size="sm" onClick={openPicker}>
              <Plus size={14} /> {t("attendance.editRegister")}
            </Button>
          </div>

          {presentKids.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">{t("attendance.present")}</p>
              <Chips tone="present">{presentKids}</Chips>
            </div>
          )}
          {absentKids.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">{t("attendance.absent")}</p>
              <Chips tone="absent">{absentKids}</Chips>
            </div>
          )}
          {excusedKids.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">{t("attendance.excused")}</p>
              <Chips tone="excused">{excusedKids}</Chips>
            </div>
          )}
          {existing.note && <p className="text-[13px] text-[var(--text-secondary)] italic">“{existing.note}”</p>}
          <p className="text-[12px] text-[var(--text-secondary)]">
            {existing.updatedBy ? `${t("attendance.lastUpdatedBy")} ` : `${t("attendance.alreadyRecorded")} `}
            <span className="font-semibold text-[var(--text-primary)]">{savedBy ?? "—"}</span>
          </p>
        </div>
      )}

      {error && step === "closed" && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {justSaved && (
        <p className="text-[13px] font-semibold text-[var(--color-sage-deep)] flex items-center gap-1.5">
          <CircleCheck size={15} /> {t("attendance.saved")}
        </p>
      )}

      <Modal open={step === "select"} onClose={() => setStep("closed")} title={`${t("attendance.modalTitle")} — ${dateLabel}`} size="md">
        <div className="space-y-4">
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

/** The attendance card: pick a date, tap + and tick who was there — everyone not ticked is absent. */
export function AttendanceTaker({ classId, pupils }: { classId: string; pupils: Child[] }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const today = todayInAmsterdam();
  const [date, setDate] = useState(today);
  const [version, setVersion] = useState(0);
  const registerRef = useRef<HTMLDivElement>(null);
  const className = useAppStore((s) => s.classes.find((c) => c.id === classId)?.name ?? "");
  const isAdmin = user?.role === "admin";

  function openDate(next: string) {
    setDate(next);
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
    <div ref={registerRef} className="scroll-mt-24">
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("attendance.heading")}</h2>
          <p className="text-[12.5px] text-[var(--text-secondary)]">{t("attendance.subtitle")}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">{t("attendance.dateLabel")}</label>
          <input
            type="date"
            value={date}
            max={today}
            min={isAdmin ? undefined : addDays(today, -MAX_BACKFILL_DAYS)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring"
          />
        </div>
      </div>

      <Register key={`${classId}|${date}`} classId={classId} date={date} pupils={pupils} onSaved={() => setVersion((v) => v + 1)} />
      {!isAdmin && <p className="text-[11px] text-[var(--text-secondary)] mt-4">{t("attendance.backfillHint")}</p>}
    </Card>
    </div>
    <AttendanceHistory classId={classId} className={className} pupils={pupils} version={version} onOpenDate={openDate} />
    </div>
  );
}
