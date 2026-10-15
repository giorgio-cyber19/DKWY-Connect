"use client";

import { useEffect, useState } from "react";
import { Check, X, MailCheck, Minus, Plus, CircleCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { apiGet, apiPut } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import { addDays, MAX_BACKFILL_DAYS, todayInAmsterdam } from "@/lib/attendance-stats";
import { getUser } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus, Child } from "@/lib/types";

const STATUS_STYLES: Record<AttendanceStatus, { active: string; Icon: typeof Check }> = {
  present: { active: "bg-[var(--color-sage-deep)] text-white border-[var(--color-sage-deep)]", Icon: Check },
  absent: { active: "bg-red-500 text-white border-red-500", Icon: X },
  excused: { active: "bg-[var(--color-gold-deep)] text-white border-[var(--color-gold-deep)]", Icon: MailCheck },
};

function Register({ classId, date, pupils }: { classId: string; date: string; pupils: Child[] }) {
  const { t, language } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<AttendanceRecord | null>(null);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [visitors, setVisitors] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ record: AttendanceRecord | null }>(`/api/attendance?classId=${encodeURIComponent(classId)}&date=${date}`)
      .then(({ record }) => {
        if (cancelled) return;
        // Everyone starts as present; a saved register only overrides the children it covers.
        const initial: Record<string, AttendanceStatus> = {};
        for (const child of pupils) initial[child.id] = record?.marks[child.id] ?? "present";
        setMarks(initial);
        setVisitors(record?.visitors ?? 0);
        setNote(record?.note ?? "");
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
    // The register is fetched once per (class, date); `pupils` only seeds the defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  if (!loaded) return <p className="text-sm text-[var(--text-secondary)] py-6">{t("attendance.loading")}</p>;

  const counts = { present: 0, absent: 0, excused: 0 };
  for (const child of pupils) counts[marks[child.id] ?? "present"] += 1;

  function setStatus(childId: string, status: AttendanceStatus) {
    setMarks((m) => ({ ...m, [childId]: status }));
    setJustSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut<{ record: AttendanceRecord }>("/api/attendance", { classId, date, marks, visitors, note });
      setExisting(res.record);
      setJustSaved(true);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSaving(false);
    }
  }

  const savedBy = existing ? getUser(existing.updatedBy ?? existing.takenBy)?.name : undefined;

  return (
    <div className="space-y-4">
      {existing && (
        <p className="text-[12px] text-[var(--text-secondary)]">
          {existing.updatedBy ? `${t("attendance.lastUpdatedBy")} ` : `${t("attendance.alreadyRecorded")} `}
          <span className="font-semibold text-[var(--text-primary)]">{savedBy ?? "—"}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold flex flex-wrap gap-x-3 gap-y-1">
          <span className="text-[var(--color-sage-deep)]">
            {counts.present} {t("attendance.summaryPresent")}
          </span>
          <span className="text-red-500">
            {counts.absent} {t("attendance.summaryAbsent")}
          </span>
          <span className="text-[var(--color-gold-deep)]">
            {counts.excused} {t("attendance.summaryExcused")}
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMarks(Object.fromEntries(pupils.map((c) => [c.id, "present" as AttendanceStatus])));
            setJustSaved(false);
          }}
        >
          <Check size={13} /> {t("attendance.markAllPresent")}
        </Button>
      </div>

      <ul className="divide-y divide-[var(--border-softer)] rounded-2xl border border-[var(--border-soft)]">
        {pupils.map((child) => {
          const status = marks[child.id] ?? "present";
          return (
            <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={child.name} color={child.photoColor} size="sm" />
                <span className="text-sm font-semibold truncate">{child.name}</span>
              </div>
              <div role="radiogroup" aria-label={child.name} className="flex gap-1.5">
                {(["present", "absent", "excused"] as AttendanceStatus[]).map((s) => {
                  const { active, Icon } = STATUS_STYLES[s];
                  const selected = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setStatus(child.id, s)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors focus-ring",
                        selected ? active : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-black/[0.04]"
                      )}
                    >
                      <Icon size={13} /> <span className="hidden sm:inline">{t(`attendance.${s}`)}</span>
                      <span className="sm:hidden sr-only">{t(`attendance.${s}`)}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

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
            onChange={(e) => {
              setNote(e.target.value);
              setJustSaved(false);
            }}
            rows={2}
            maxLength={500}
            placeholder={t("attendance.notePlaceholder")}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {justSaved && (
        <p className="text-[13px] font-semibold text-[var(--color-sage-deep)] flex items-center gap-1.5">
          <CircleCheck size={15} /> {t("attendance.saved")}
        </p>
      )}

      <Button className="w-full sm:w-auto" onClick={save} loading={saving} disabled={saving || pupils.length === 0}>
        {saving ? t("attendance.saving") : existing ? t("attendance.update") : t("attendance.save")}
      </Button>
    </div>
  );
}

/** The "take attendance" card: pick a date, mark the exceptions, save. */
export function AttendanceTaker({ classId, pupils }: { classId: string; pupils: Child[] }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const today = todayInAmsterdam();
  const [date, setDate] = useState(today);
  const isAdmin = user?.role === "admin";

  return (
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

      {pupils.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-4">{isAdmin ? t("attendance.noChildrenAdmin") : t("attendance.noChildren")}</p>
      ) : (
        <Register key={`${classId}|${date}`} classId={classId} date={date} pupils={pupils} />
      )}
      {!isAdmin && <p className="text-[11px] text-[var(--text-secondary)] mt-4">{t("attendance.backfillHint")}</p>}
    </Card>
  );
}
