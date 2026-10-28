"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, MapPin, Pencil, Plus, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChildCard } from "@/components/children/ChildCard";
import { AttendanceTaker } from "@/components/attendance/AttendanceTaker";
import { ClassFormModal, type ClassModalState } from "@/components/classes/ClassFormModal";
import { useAuth } from "@/lib/auth-context";
import { getAgeGroup, useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { SchoolClass } from "@/lib/types";

function ClassDetail({ schoolClass, isAdmin, onEdit }: { schoolClass: SchoolClass; isAdmin: boolean; onEdit: () => void }) {
  const { t, language } = useLanguage();
  const children = useAppStore((s) => s.children);
  const lessonPlans = useAppStore((s) => s.lessonPlans);

  const ageGroup = getAgeGroup(schoolClass.ageGroupId);
  const myChildren = children.filter((c) => c.classId === schoolClass.id);
  const myLessons = lessonPlans.filter((l) => l.ageGroupId === schoolClass.ageGroupId);

  return (
    <div>
      {isAdmin && (
        <Link href="/my-class" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft size={15} /> {t("myClass.backToAllClasses")}
        </Link>
      )}
      <PageHeader
        eyebrow={isAdmin ? t("myClass.allClassesEyebrow") : t("myClass.yourMinistryEyebrow")}
        title={schoolClass.name}
        description={`${ageGroup?.name} (${ageGroup?.range}) · ${schoolClass.room}`}
        actions={
          isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={14} /> {t("myClass.editClass")}
            </Button>
          )
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)]">
            <Users size={19} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none">{myChildren.length}</p>
            <p className="text-[11.5px] text-[var(--text-secondary)] mt-1">{t("myClass.childrenEnrolled")}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-blue)_16%,transparent)] flex items-center justify-center text-[var(--color-blue-deep)]">
            <BookOpen size={19} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none">{myLessons.length}</p>
            <p className="text-[11.5px] text-[var(--text-secondary)] mt-1">{t("myClass.lessonPlansStat")}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] flex items-center justify-center text-[var(--color-sage-deep)]">
            <MapPin size={19} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none">{schoolClass.room}</p>
            <p className="text-[11.5px] text-[var(--text-secondary)] mt-1">{t("myClass.meetingRoom")}</p>
          </div>
        </Card>
      </div>

      <section className="mb-8">
        <AttendanceTaker key={schoolClass.id} classId={schoolClass.id} pupils={myChildren} />
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">{t("myClass.classRoster")}</h2>
          <Link href="/children" className="text-xs font-semibold text-[var(--color-blue-deep)]">
            {t("myClass.viewAllPortfolios")}
          </Link>
        </div>
        {myChildren.length === 0 ? (
          <EmptyState icon={Users} title={t("myClass.noChildrenEnrolled")} />
        ) : (
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {myChildren.map((c) => (
              <ChildCard key={c.id} child={c} />
            ))}
          </StaggerGrid>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">{t("myClass.yourLessonPlans")}</h2>
          <Link href="/lessons" className="text-xs font-semibold text-[var(--color-blue-deep)]">
            {t("common.viewAll")}
          </Link>
        </div>
        {myLessons.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("myClass.noLessonPlansTitle")} description={t("myClass.noLessonPlansDescription")} />
        ) : (
          <div className="space-y-2.5">
            {myLessons.map((l) => (
              <Link key={l.id} href={`/lessons/${l.id}`}>
                <Card className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${l.coverColor} 16%, transparent)`, color: l.coverColor }}>
                    <Sparkles size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{l.title}</p>
                    <p className="text-[11.5px] text-[var(--text-secondary)]">{l.passage}</p>
                  </div>
                  <Badge tone={l.status === "published" ? "sage" : "neutral"}>{enumLabels.lessonStatus[language][l.status]}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MyClassContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const selectedId = useSearchParams().get("class");
  const children = useAppStore((s) => s.children);
  const classes = useAppStore((s) => s.classes);
  const ageGroups = useAppStore((s) => s.ageGroups);
  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [classModal, setClassModal] = useState<ClassModalState>(null);
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const myClass = classes.find((c) => c.id === user.classId);
  const activeClass = isAdmin ? classes.find((c) => c.id === selectedId) : myClass;
  const ageGroupOptions = ageGroups.map((a) => ({ id: a.id, label: `${a.name} (${a.range})` }));

  const modal = isAdmin && (
    <ClassFormModal
      state={classModal}
      onClose={() => setClassModal(null)}
      ageGroupIds={ageGroupOptions}
      onSaved={(saved) => {
        if (classModal?.mode === "add") router.push(`/my-class?class=${saved.id}`);
      }}
    />
  );

  if (activeClass) {
    return (
      <>
        <ClassDetail schoolClass={activeClass} isAdmin={isAdmin} onEdit={() => setClassModal({ mode: "edit", schoolClass: activeClass })} />
        {modal}
      </>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("myClass.allClassesEyebrow")}
        title={t("myClass.allClassesTitle")}
        description={t("myClass.allClassesDescription")}
        actions={
          isAdmin && (
            <Button size="sm" onClick={() => setClassModal({ mode: "add" })} disabled={ageGroups.length === 0}>
              <Plus size={14} /> {t("myClass.newClass")}
            </Button>
          )
        }
      />
      {isAdmin && ageGroups.length === 0 && <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">{t("myClass.needAgeGroup")}</p>}
      {classes.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 max-w-xs">
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("attendance.classLabel")}</label>
            <select
              value={attendanceClassId}
              onChange={(e) => setAttendanceClassId(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring"
            >
              <option value="">{t("attendance.chooseClass")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {attendanceClassId && (
            <AttendanceTaker key={attendanceClassId} classId={attendanceClassId} pupils={children.filter((c) => c.classId === attendanceClassId)} />
          )}
        </div>
      )}
      {classes.length === 0 ? (
        <EmptyState icon={Users} title={t("myClass.noClassesTitle")} description={t("myClass.noClassesDescription")} />
      ) : (
        <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => {
            const ageGroup = getAgeGroup(c.ageGroupId);
            const card = (
              <Card className="p-5 h-full">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}>
                  <Users size={20} />
                </div>
                <h3 className="font-display font-semibold text-lg">{c.name}</h3>
                <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">{ageGroup?.name} · {c.room}</p>
                <p className="text-sm font-semibold">{c.childCount} {t("myClass.childrenSuffix")}</p>
              </Card>
            );
            return isAdmin ? (
              <Link key={c.id} href={`/my-class?class=${c.id}`} className="block rounded-[20px] focus-ring" aria-label={`${t("myClass.openClass")}: ${c.name}`}>
                {card}
              </Link>
            ) : (
              <div key={c.id}>{card}</div>
            );
          })}
        </StaggerGrid>
      )}
      {modal}
    </div>
  );
}

export default function MyClassPage() {
  return (
    <Suspense fallback={null}>
      <MyClassContent />
    </Suspense>
  );
}
