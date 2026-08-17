"use client";

import { useState } from "react";
import { Plus, MapPin, Users, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

function AddAgeGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !range.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().createAgeGroup({ name: name.trim(), range: range.trim() });
      setName("");
      setRange("");
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("admin.classesAddAgeGroupButton")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("admin.classesAgeGroupNamePlaceholder")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.classesAgeRangeLabel")}</label>
          <input value={range} onChange={(e) => setRange(e.target.value)} className={inputClass} placeholder={t("admin.classesAgeRangePlaceholder")} />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !range.trim() || submitting}>
          {t("admin.classesAddAgeGroupButton")}
        </Button>
      </div>
    </Modal>
  );
}

function AddClassModal({ open, onClose, ageGroupIds }: { open: boolean; onClose: () => void; ageGroupIds: { id: string; label: string }[] }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [ageGroupId, setAgeGroupId] = useState(ageGroupIds[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !ageGroupId) return;
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().createClass({ name: name.trim(), ageGroupId, room: room.trim() || "TBD" });
      setName("");
      setRoom("");
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("admin.classesAddClassButton")} size="sm">
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
          {t("admin.classesAddClassButton")}
        </Button>
      </div>
    </Modal>
  );
}

export function AdminClasses() {
  const { t } = useLanguage();
  const classes = useAppStore((s) => s.classes);
  const ageGroups = useAppStore((s) => s.ageGroups);
  const [addAgeGroupOpen, setAddAgeGroupOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg">{t("admin.classesAgeGroupsHeading")}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {ageGroups.length} {ageGroups.length === 1 ? t("admin.classesAgeGroupSingular") : t("admin.classesAgeGroupPlural")}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddAgeGroupOpen(true)}>
            <Plus size={14} /> {t("admin.classesAddAgeGroupButton")}
          </Button>
        </div>
        {ageGroups.length === 0 ? (
          <EmptyState icon={Tag} title={t("admin.classesNoAgeGroupsTitle")} description={t("admin.classesNoAgeGroupsDescription")} />
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {ageGroups.map((ag) => (
              <div key={ag.id} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border-soft)] text-sm">
                <span className="font-semibold">{ag.name}</span>
                <span className="text-[var(--text-secondary)]">{ag.range}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg">{t("admin.classesHeading")}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {classes.length} {classes.length === 1 ? t("admin.classesClassSingular") : t("admin.classesClassPlural")}
            </p>
          </div>
          <Button size="sm" onClick={() => setAddClassOpen(true)} disabled={ageGroups.length === 0}>
            <Plus size={14} /> {t("admin.classesAddClassButton")}
          </Button>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("admin.classesNoClassesTitle")}
            description={ageGroups.length === 0 ? t("admin.classesNoClassesDescriptionNeedAgeGroup") : t("admin.classesNoClassesDescriptionReady")}
          />
        ) : (
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const ageGroup = ageGroups.find((a) => a.id === c.ageGroupId);
              const teacher = getUser(c.teacherIds[0]);
              return (
                <StaggerItem key={c.id}>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: c.color }}>
                        <Users size={16} />
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{ageGroup?.range}</span>
                    </div>
                    <h3 className="font-display font-semibold text-lg">{c.name}</h3>
                    <p className="text-[12.5px] text-[var(--text-secondary)] mb-3 flex items-center gap-1">
                      <MapPin size={11} /> {c.room}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-softer)] text-[12.5px]">
                      <span className="text-[var(--text-secondary)]">{teacher?.name ?? t("admin.classesNoTeacherAssigned")}</span>
                      <span className="font-semibold">{c.childCount} {t("admin.classesChildrenSuffix")}</span>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        )}
      </div>

      <AddAgeGroupModal open={addAgeGroupOpen} onClose={() => setAddAgeGroupOpen(false)} />
      <AddClassModal open={addClassOpen} onClose={() => setAddClassOpen(false)} ageGroupIds={ageGroups.map((a) => ({ id: a.id, label: `${a.name} (${a.range})` }))} />
    </div>
  );
}
