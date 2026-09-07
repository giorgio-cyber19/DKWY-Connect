"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Palmtree, Flag, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { enumLabels } from "@/lib/i18n/enum-labels";
import { formatDate } from "@/lib/utils";
import type { Holiday } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";
const DEFAULT_SCHOOL_YEAR = "2025-2026";

type HolidayModalState = { mode: "add" } | { mode: "edit"; holiday: Holiday } | null;

function HolidayModal({ state, onClose }: { state: HolidayModalState; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [type, setType] = useState<Holiday["type"]>("national_holiday");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [schoolYear, setSchoolYear] = useState(DEFAULT_SCHOOL_YEAR);
  const [provisional, setProvisional] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const open = state !== null;
  const editing = state?.mode === "edit" ? state.holiday : null;

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setType(editing?.type ?? "national_holiday");
      setStartDate(editing?.startDate ?? "");
      setEndDate(editing?.endDate ?? "");
      setSchoolYear(editing?.schoolYear ?? DEFAULT_SCHOOL_YEAR);
      setProvisional(editing?.provisional ?? false);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const isNational = type === "national_holiday";
  const valid = name.trim() && startDate && (isNational || endDate) && schoolYear.trim();

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        type,
        startDate,
        endDate: isNational ? startDate : endDate,
        schoolYear: schoolYear.trim(),
        provisional: isNational ? provisional : false,
      };
      if (editing) {
        await useAppStore.getState().updateHoliday(editing.id, payload);
      } else {
        await useAppStore.getState().createHoliday(payload);
      }
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("calendar.holidaysEditButton") : t("calendar.holidaysAddButton")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("calendar.holidaysNamePlaceholder")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.type")}</label>
          <select value={type} onChange={(e) => setType(e.target.value as Holiday["type"])} className={inputClass}>
            <option value="national_holiday">{enumLabels.holidayType[language].national_holiday}</option>
            <option value="school_vacation">{enumLabels.holidayType[language].school_vacation}</option>
          </select>
        </div>
        {isNational ? (
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.holidaysDateLabel")}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.holidaysStartDateLabel")}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.holidaysEndDateLabel")}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.holidaysSchoolYearLabel")}</label>
          <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className={inputClass} placeholder={t("calendar.holidaysSchoolYearPlaceholder")} />
        </div>
        {isNational && (
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={provisional} onChange={(e) => setProvisional(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" />
            {t("calendar.holidaysProvisionalLabel")}
          </label>
        )}
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!valid || submitting}>
          {editing ? t("common.saveChanges") : t("calendar.holidaysAddButton")}
        </Button>
      </div>
    </Modal>
  );
}

function HolidayRow({ holiday, onEdit, onDelete }: { holiday: Holiday; onEdit: () => void; onDelete: () => void }) {
  const { t, language } = useLanguage();
  const singleDay = holiday.startDate === holiday.endDate;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--border-soft)]">
      <div className="min-w-0 flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
          style={{ background: holiday.type === "school_vacation" ? "var(--color-sage-deep)" : "var(--color-coral-deep)" }}
        >
          {holiday.type === "school_vacation" ? <Palmtree size={14} /> : <Flag size={14} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
            {holiday.name}
            {holiday.provisional && (
              <Badge tone="gold" className="!py-0.5 !px-1.5 !text-[9.5px] shrink-0">
                <CircleAlert size={9} /> {t("calendar.provisionalBadge")}
              </Badge>
            )}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {singleDay ? formatDate(holiday.startDate, undefined, language) : `${formatDate(holiday.startDate, undefined, language)} – ${formatDate(holiday.endDate, undefined, language)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]" title={t("common.edit")}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10" title={t("common.delete")}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function HolidaysManager() {
  const { t } = useLanguage();
  const holidays = useAppStore((s) => s.holidays);
  const [modal, setModal] = useState<HolidayModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

  const vacations = holidays.filter((h) => h.type === "school_vacation").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const national = holidays.filter((h) => h.type === "national_holiday").sort((a, b) => a.startDate.localeCompare(b.startDate));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useAppStore.getState().removeHoliday(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{t("calendar.holidaysSchoolYearHeading")}: <span className="font-semibold text-[var(--text-primary)]">{DEFAULT_SCHOOL_YEAR}</span></p>
        <Button size="sm" onClick={() => setModal({ mode: "add" })}>
          <Plus size={14} /> {t("calendar.holidaysAddButton")}
        </Button>
      </div>

      <div>
        <h3 className="font-display font-semibold text-lg mb-1">{t("calendar.holidaysSchoolVacationsHeading")}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {vacations.length} {vacations.length === 1 ? t("calendar.holidaysVacationSingular") : t("calendar.holidaysVacationPlural")}
        </p>
        {vacations.length === 0 ? (
          <EmptyState icon={Palmtree} title={t("calendar.holidaysNoVacationsTitle")} description={t("calendar.holidaysNoVacationsDescription")} />
        ) : (
          <div className="space-y-2.5">
            {vacations.map((h) => (
              <HolidayRow key={h.id} holiday={h} onEdit={() => setModal({ mode: "edit", holiday: h })} onDelete={() => setDeleteTarget(h)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display font-semibold text-lg mb-1">{t("calendar.holidaysNationalHeading")}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {national.length} {national.length === 1 ? t("calendar.holidaysNationalSingular") : t("calendar.holidaysNationalPlural")}
        </p>
        {national.length === 0 ? (
          <EmptyState icon={Flag} title={t("calendar.holidaysNoNationalTitle")} description={t("calendar.holidaysNoNationalDescription")} />
        ) : (
          <div className="space-y-2.5">
            {national.map((h) => (
              <HolidayRow key={h.id} holiday={h} onEdit={() => setModal({ mode: "edit", holiday: h })} onDelete={() => setDeleteTarget(h)} />
            ))}
          </div>
        )}
      </div>

      <HolidayModal state={modal} onClose={() => setModal(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t("calendar.holidaysDeleteConfirmTitle")}
        message={t("calendar.holidaysDeleteConfirmMessage")}
        confirming={deleting}
      />
    </div>
  );
}
