"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, LayoutTemplate, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { LessonCard } from "@/components/lessons/LessonCard";
import { useAppStore } from "@/lib/store";

export default function LessonsPage() {
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const ageGroups = useAppStore((s) => s.ageGroups);
  const [status, setStatus] = useState("all");
  const [ageGroup, setAgeGroup] = useState("all");

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
  ];

  const filtered = useMemo(() => {
    return lessonPlans.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (ageGroup !== "all" && l.ageGroupId !== ageGroup) return false;
      return true;
    });
  }, [status, ageGroup]);

  return (
    <div>
      <PageHeader
        eyebrow="Curriculum"
        title="Lesson Plans"
        description="Prepare, publish, and revisit lesson plans for every age group in the Sunday School ministry."
        actions={
          <>
            <Link href="/lessons/new">
              <Button variant="outline" size="md">
                <LayoutTemplate size={15} /> Templates
              </Button>
            </Link>
            <Link href="/lessons/new">
              <Button size="md">
                <Plus size={15} /> New Lesson
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Tabs tabs={statusTabs} active={status} onChange={setStatus} />
        <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
          <Filter size={14} className="text-[var(--text-secondary)] shrink-0" />
          <button
            onClick={() => setAgeGroup("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              ageGroup === "all" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
            }`}
          >
            All Ages
          </button>
          {ageGroups.map((ag) => (
            <button
              key={ag.id}
              onClick={() => setAgeGroup(ag.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                ageGroup === ag.id ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
              }`}
            >
              {ag.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={lessonPlans.length === 0 ? "No lesson plans yet" : "No lesson plans found"}
          description={lessonPlans.length === 0 ? "Create your first lesson plan to get started." : "Try adjusting your filters, or create a new lesson plan."}
        />
      ) : (
        <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
