"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import type { SchoolClass } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

export type ClassModalState = { mode: "add" } | { mode: "edit"; schoolClass: SchoolClass } | null;

export function ClassFormModal({ state, onClose, ageGroupIds, onSaved }: { state: ClassModalState; onClose: () => void; ageGroupIds: { id: string; label: string }[]; onSaved?: (schoolClass: SchoolClass) => void }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [ageGroupId, setAgeGroupId] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const open = state !== null;
  const editing = state?.mode === "edit" ? state.schoolClass : null;

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setAgeGroupId(editing?.ageGroupId ?? ageGroupIds[0]?.id ?? "");
      setRoom(editing?.room ?? "");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function submit() {
    if (!name.trim() || !ageGroupId) return;
    setSubmitting(true);
    setError("");
    try {
      const data = { name: name.trim(), ageGroupId, room: room.trim() || "TBD" };
      let saved: SchoolClass;
      if (editing) {
        await useAppStore.getState().updateClass(editing.id, data);
        saved = { ...editing, ...data };
      } else {
        saved = await useAppStore.getState().createClass(data);
      }
      onClose();
      onSaved?.(saved);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("admin.classesEditClassButton") : t("admin.classesAddClassButton")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.classesClassNameLabel")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("admin.classesClassNamePlaceholder")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.classesAgeGroupSelectLabel")}</label>
          <select value={ageGroupId} onChange={(e) => setAgeGroupId(e.target.value)} className={inputClass}>
            {ageGroupIds.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.classesRoomLabel")}</label>
          <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} placeholder={t("admin.classesRoomPlaceholder")} />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !ageGroupId || submitting}>
          {editing ? t("common.saveChanges") : t("admin.classesAddClassButton")}
        </Button>
      </div>
    </Modal>
  );
}
