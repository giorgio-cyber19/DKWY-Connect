"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MapPin, Users, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import type { AgeGroup, SchoolClass } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

type AgeGroupModalState = { mode: "add" } | { mode: "edit"; ageGroup: AgeGroup } | null;
type ClassModalState = { mode: "add" } | { mode: "edit"; schoolClass: SchoolClass } | null;

function AgeGroupModal({ state, onClose }: { state: AgeGroupModalState; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const open = state !== null;
  const editing = state?.mode === "edit" ? state.ageGroup : null;

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setRange(editing?.range ?? "");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function submit() {
    if (!name.trim() || !range.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await useAppStore.getState().updateAgeGroup(editing.id, { name: name.trim(), range: range.trim() });
      } else {
        await useAppStore.getState().createAgeGroup({ name: name.trim(), range: range.trim() });
      }
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("admin.classesEditAgeGroupButton") : t("admin.classesAddAgeGroupButton")} size="sm">
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
          {editing ? t("common.saveChanges") : t("admin.classesAddAgeGroupButton")}
        </Button>
      </div>
    </Modal>
  );
}

function ClassModal({ state, onClose, ageGroupIds }: { state: ClassModalState; onClose: () => void; ageGroupIds: { id: string; label: string }[] }) {
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
      if (editing) {
        await useAppStore.getState().updateClass(editing.id, { name: name.trim(), ageGroupId, room: room.trim() || "TBD" });
      } else {
        await useAppStore.getState().createClass({ name: name.trim(), ageGroupId, room: room.trim() || "TBD" });
      }
      onClose();
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

export function AdminClasses() {
  const { t, language } = useLanguage();
  const classes = useAppStore((s) => s.classes);
  const ageGroups = useAppStore((s) => s.ageGroups);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const [ageGroupModal, setAgeGroupModal] = useState<AgeGroupModalState>(null);
  const [classModal, setClassModal] = useState<ClassModalState>(null);
  const [deleteAgeGroup, setDeleteAgeGroup] = useState<AgeGroup | null>(null);
  const [deleteClass, setDeleteClass] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function ageGroupUsage(ageGroupId: string) {
    return {
      classCount: classes.filter((c) => c.ageGroupId === ageGroupId).length,
      lessonCount: lessonPlans.filter((l) => l.ageGroupId === ageGroupId).length,
    };
  }

  async function confirmDeleteAgeGroup() {
    if (!deleteAgeGroup) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await useAppStore.getState().removeAgeGroup(deleteAgeGroup.id);
      setDeleteAgeGroup(null);
    } catch (err) {
      setDeleteError(translateApiError(err, language));
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteClass() {
    if (!deleteClass) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await useAppStore.getState().removeClass(deleteClass.id);
      setDeleteClass(null);
    } catch (err) {
      setDeleteError(translateApiError(err, language));
    } finally {
      setDeleting(false);
    }
  }

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
          <Button size="sm" variant="outline" onClick={() => setAgeGroupModal({ mode: "add" })}>
            <Plus size={14} /> {t("admin.classesAddAgeGroupButton")}
          </Button>
        </div>
        {ageGroups.length === 0 ? (
          <EmptyState icon={Tag} title={t("admin.classesNoAgeGroupsTitle")} description={t("admin.classesNoAgeGroupsDescription")} />
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {ageGroups.map((ag) => {
              const usage = ageGroupUsage(ag.id);
              const inUse = usage.classCount > 0 || usage.lessonCount > 0;
              return (
                <div key={ag.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-xl border border-[var(--border-soft)] text-sm">
                    <span className="font-semibold">{ag.name}</span>
                    <span className="text-[var(--text-secondary)]">{ag.range}</span>
                    <button
                      onClick={() => setAgeGroupModal({ mode: "edit", ageGroup: ag })}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]"
                      title={t("common.edit")}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteAgeGroup(ag);
                      }}
                      disabled={inUse}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none"
                      title={t("common.delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {inUse && <p className="text-[10.5px] text-[var(--text-secondary)] pl-1">{t("admin.classesAgeGroupInUseNote")}</p>}
                </div>
              );
            })}
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
          <Button size="sm" onClick={() => setClassModal({ mode: "add" })} disabled={ageGroups.length === 0}>
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
              const inUse = c.childCount > 0;
              return (
                <StaggerItem key={c.id}>
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: c.color }}>
                        <Users size={16} />
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] mr-1">{ageGroup?.range}</span>
                        <button
                          onClick={() => setClassModal({ mode: "edit", schoolClass: c })}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]"
                          title={t("common.edit")}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteClass(c);
                          }}
                          disabled={inUse}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none"
                          title={t("common.delete")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-display font-semibold text-lg">{c.name}</h3>
                    <p className="text-[12.5px] text-[var(--text-secondary)] mb-3 flex items-center gap-1">
                      <MapPin size={11} /> {c.room}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-softer)] text-[12.5px]">
                      <span className="text-[var(--text-secondary)]">{teacher?.name ?? t("admin.classesNoTeacherAssigned")}</span>
                      <span className="font-semibold">{c.childCount} {t("admin.classesChildrenSuffix")}</span>
                    </div>
                    {inUse && <p className="text-[10.5px] text-[var(--text-secondary)] mt-2">{t("admin.classesClassInUseNote")}</p>}
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        )}
      </div>

      <AgeGroupModal state={ageGroupModal} onClose={() => setAgeGroupModal(null)} />
      <ClassModal state={classModal} onClose={() => setClassModal(null)} ageGroupIds={ageGroups.map((a) => ({ id: a.id, label: `${a.name} (${a.range})` }))} />

      <ConfirmDialog
        open={!!deleteAgeGroup}
        onClose={() => setDeleteAgeGroup(null)}
        onConfirm={confirmDeleteAgeGroup}
        title={t("admin.classesDeleteAgeGroupConfirmTitle")}
        message={t("admin.classesDeleteAgeGroupConfirmMessage")}
        confirming={deleting}
        error={deleteError}
      />
      <ConfirmDialog
        open={!!deleteClass}
        onClose={() => setDeleteClass(null)}
        onConfirm={confirmDeleteClass}
        title={t("admin.classesDeleteClassConfirmTitle")}
        message={t("admin.classesDeleteClassConfirmMessage")}
        confirming={deleting}
        error={deleteError}
      />
    </div>
  );
}
