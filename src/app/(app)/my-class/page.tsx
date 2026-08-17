"use client";

import Link from "next/link";
import { Users, BookOpen, MapPin, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChildCard } from "@/components/children/ChildCard";
import { useAuth } from "@/lib/auth-context";
import { getAgeGroup, useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";

export default function MyClassPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const children = useAppStore((s) => s.children);
  const classes = useAppStore((s) => s.classes);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  if (!user) return null;

  const myClass = classes.find((c) => c.id === user.classId);

  if (user.role === "admin" || !myClass) {
    return (
      <div>
        <PageHeader eyebrow={t("myClass.allClassesEyebrow")} title={t("myClass.allClassesTitle")} description={t("myClass.allClassesDescription")} />
        {classes.length === 0 ? (
          <EmptyState icon={Users} title={t("myClass.noClassesTitle")} description={t("myClass.noClassesDescription")} />
        ) : (
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c) => {
              const ageGroup = getAgeGroup(c.ageGroupId);
              return (
                <Card key={c.id} className="p-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}>
                    <Users size={20} />
                  </div>
                  <h3 className="font-display font-semibold text-lg">{c.name}</h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">{ageGroup?.name} · {c.room}</p>
                  <p className="text-sm font-semibold">{c.childCount} {t("myClass.childrenSuffix")}</p>
                </Card>
              );
            })}
          </StaggerGrid>
        )}
      </div>
    );
  }

  const ageGroup = getAgeGroup(myClass.ageGroupId);
  const myChildren = children.filter((c) => c.classId === myClass.id);
  const myLessons = lessonPlans.filter((l) => l.ageGroupId === myClass.ageGroupId);

  return (
    <div>
      <PageHeader eyebrow={t("myClass.yourMinistryEyebrow")} title={myClass.name} description={`${ageGroup?.name} (${ageGroup?.range}) · ${myClass.room}`} />

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
            <p className="font-display text-xl font-semibold leading-none">{myClass.room}</p>
            <p className="text-[11.5px] text-[var(--text-secondary)] mt-1">{t("myClass.meetingRoom")}</p>
          </div>
        </Card>
      </div>

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
