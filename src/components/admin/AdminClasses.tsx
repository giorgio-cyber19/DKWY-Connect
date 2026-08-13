"use client";

import { useState } from "react";
import { Plus, MapPin, Users, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

function AddAgeGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      setError(err instanceof Error ? err.message : "Couldn't add the age group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Age Group" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Primary" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Age Range</label>
          <input value={range} onChange={(e) => setRange(e.target.value)} className={inputClass} placeholder="e.g. 5–7 yrs" />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !range.trim() || submitting}>
          Add Age Group
        </Button>
      </div>
    </Modal>
  );
}

function AddClassModal({ open, onClose, ageGroupIds }: { open: boolean; onClose: () => void; ageGroupIds: { id: string; label: string }[] }) {
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
      setError(err instanceof Error ? err.message : "Couldn't add the class. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Class" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Class Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Rainbow Room" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Age Group</label>
          <select value={ageGroupId} onChange={(e) => setAgeGroupId(e.target.value)} className={inputClass}>
            {ageGroupIds.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Room</label>
          <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} placeholder="e.g. Room 201" />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !ageGroupId || submitting}>
          Add Class
        </Button>
      </div>
    </Modal>
  );
}

export function AdminClasses() {
  const classes = useAppStore((s) => s.classes);
  const ageGroups = useAppStore((s) => s.ageGroups);
  const [addAgeGroupOpen, setAddAgeGroupOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg">Age Groups</h3>
            <p className="text-sm text-[var(--text-secondary)]">{ageGroups.length} age group{ageGroups.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddAgeGroupOpen(true)}>
            <Plus size={14} /> Add Age Group
          </Button>
        </div>
        {ageGroups.length === 0 ? (
          <EmptyState icon={Tag} title="No age groups yet" description="Create one before adding classes — e.g. Primary, ages 5–7." />
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
            <h3 className="font-display font-semibold text-lg">Classes</h3>
            <p className="text-sm text-[var(--text-secondary)]">{classes.length} class{classes.length === 1 ? "" : "es"}</p>
          </div>
          <Button size="sm" onClick={() => setAddClassOpen(true)} disabled={ageGroups.length === 0}>
            <Plus size={14} /> Add Class
          </Button>
        </div>
        {classes.length === 0 ? (
          <EmptyState icon={Users} title="No classes yet" description={ageGroups.length === 0 ? "Add an age group first, then create a class." : "Create the first class for your Sunday School ministry."} />
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
                      <span className="text-[var(--text-secondary)]">{teacher?.name ?? "No teacher assigned"}</span>
                      <span className="font-semibold">{c.childCount} children</span>
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
