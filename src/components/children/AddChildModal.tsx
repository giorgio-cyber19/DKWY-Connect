"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import type { SchoolClass } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

export function AddChildModal({
  open,
  onClose,
  classes,
  defaultClassId,
  defaultTeacherId,
}: {
  open: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  defaultClassId?: string;
  defaultTeacherId?: string;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("5");
  const [birthday, setBirthday] = useState("");
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? "");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("Parent");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [allergies, setAllergies] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t, language } = useLanguage();

  function reset() {
    setName("");
    setAge("5");
    setBirthday("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setAllergies("");
  }

  async function submit() {
    if (!name.trim() || !classId) return;
    const cls = classes.find((c) => c.id === classId);
    const teacherId = defaultTeacherId ?? cls?.teacherIds[0] ?? "";
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().createChild({
        name: name.trim(),
        age: Number(age) || 0,
        birthday: birthday || new Date().toISOString().slice(0, 10),
        classId,
        teacherId,
        guardians: guardianName.trim()
          ? [{ name: guardianName.trim(), relation: guardianRelation, phone: guardianPhone, email: guardianEmail }]
          : [],
        allergies: allergies.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("children.addChildTitle")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.addChildNameLabel")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("children.addChildNamePlaceholder")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.ageLabel")}</label>
            <input value={age} onChange={(e) => setAge(e.target.value)} type="number" min={0} max={18} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.birthdayLabel")}</label>
            <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.classLabel")}</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-1">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            {t("children.guardianSectionLabel")} ({t("common.optional")})
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder={t("common.name")} className={inputClass} />
            <input value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} placeholder={t("children.guardianRelationPlaceholder")} className={inputClass} />
            <input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder={t("children.guardianPhonePlaceholder")} className={inputClass} />
            <input value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder={t("common.email")} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.allergiesLabel")}</label>
          <input value={allergies} onChange={(e) => setAllergies(e.target.value)} className={inputClass} placeholder={t("children.allergiesPlaceholder")} />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !classId || submitting}>
          {t("children.addChildButton")}
        </Button>
      </div>
    </Modal>
  );
}
