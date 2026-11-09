"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { calculateAge, cn } from "@/lib/utils";
import type { Child, SchoolClass } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

/** Edits what's known about a child — everything except the portfolio content (artwork, notes, …). */
export function EditChildModal({ child, classes, onClose }: { child: Child; classes: SchoolClass[]; onClose: () => void }) {
  const { t, language } = useLanguage();
  const primary = child.guardians[0];
  const [name, setName] = useState(child.name);
  const [birthday, setBirthday] = useState(child.birthday);
  const [classId, setClassId] = useState(child.classId);
  const [guardianName, setGuardianName] = useState(primary?.name ?? "");
  const [guardianRelation, setGuardianRelation] = useState(primary?.relation ?? "Parent");
  const [guardianPhone, setGuardianPhone] = useState(primary?.phone ?? "");
  const [guardianEmail, setGuardianEmail] = useState(primary?.email ?? "");
  const [address, setAddress] = useState(child.address ?? "");
  const [allergies, setAllergies] = useState(child.allergies ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !classId) return;
    setSubmitting(true);
    setError("");
    try {
      const others = child.guardians.slice(1);
      const first = guardianName.trim() ? [{ name: guardianName.trim(), relation: guardianRelation.trim(), phone: guardianPhone.trim(), email: guardianEmail.trim() }] : [];
      await useAppStore.getState().updateChild(child.id, {
        name: name.trim(),
        birthday,
        classId,
        guardians: [...first, ...others],
        address: address.trim(),
        allergies: allergies.trim(),
      });
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t("children.editChildTitle")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.addChildNameLabel")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("children.addChildNamePlaceholder")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.birthdayLabel")}</label>
            <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.ageLabel")}</label>
            <input
              value={birthday ? calculateAge(birthday) : ""}
              readOnly
              disabled
              placeholder={t("children.ageAutoPlaceholder")}
              className={cn(inputClass, "opacity-60 cursor-not-allowed")}
            />
          </div>
        </div>
        {classes.length > 1 && (
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
        )}
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
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.addressLabel")}</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.allergiesLabel")}</label>
          <input value={allergies} onChange={(e) => setAllergies(e.target.value)} className={inputClass} placeholder={t("children.allergiesPlaceholder")} />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !classId || submitting}>
          {t("common.saveChanges")}
        </Button>
      </div>
    </Modal>
  );
}
