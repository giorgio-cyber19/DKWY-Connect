"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { LessonForm } from "@/components/lessons/LessonForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { BookX } from "lucide-react";
import type { LessonPlan } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n";

function getTemplates(t: (key: TranslationKey) => string): { id: string; name: string; description: string; color: string; data: Partial<LessonPlan> }[] {
  return [
    {
      id: "blank",
      name: t("lessons.templateBlankName"),
      description: t("lessons.templateBlankDescription"),
      color: "var(--color-ink-soft)",
      data: {},
    },
    {
      id: "bible-story",
      name: t("lessons.templateBibleStoryName"),
      description: t("lessons.templateBibleStoryDescription"),
      color: "var(--color-gold)",
      data: {
        objectives: [t("lessons.templateBibleStoryObjective1"), t("lessons.templateBibleStoryObjective2")],
        openingActivity: t("lessons.templateBibleStoryOpeningActivity"),
        craftActivity: t("lessons.templateBibleStoryCraftActivity"),
        worshipSongs: [t("lessons.templateBibleStoryWorshipSong1"), t("lessons.templateBibleStoryWorshipSong2")],
      },
    },
    {
      id: "memory-verse",
      name: t("lessons.templateMemoryVerseName"),
      description: t("lessons.templateMemoryVerseDescription"),
      color: "var(--color-blue)",
      data: {
        objectives: [t("lessons.templateMemoryVerseObjective1"), t("lessons.templateMemoryVerseObjective2")],
        openingActivity: t("lessons.templateMemoryVerseOpeningActivity"),
        discussionQuestions: [t("lessons.templateMemoryVerseDiscussionQuestion1"), t("lessons.templateMemoryVerseDiscussionQuestion2")],
      },
    },
    {
      id: "vbs",
      name: t("lessons.templateVbsName"),
      description: t("lessons.templateVbsDescription"),
      color: "var(--color-sage)",
      data: {
        objectives: [t("lessons.templateVbsObjective1"), t("lessons.templateVbsObjective2")],
        openingActivity: t("lessons.templateVbsOpeningActivity"),
        craftActivity: t("lessons.templateVbsCraftActivity"),
      },
    },
  ];
}

export default function NewLessonPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ageGroupCount = useAppStore((s) => s.ageGroups.length);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saved, setSaved] = useState<"draft" | "published" | null>(null);

  const templates = useMemo(() => getTemplates(t), [t]);
  const chosen = templates.find((tpl) => tpl.id === selectedTemplate);

  if (ageGroupCount === 0) {
    return (
      <div>
        <PageHeader eyebrow={t("lessons.eyebrowCurriculum")} title={t("lessons.newLessonPlanTitle")} />
        <EmptyState
          icon={BookX}
          title={t("lessons.noAgeGroupsTitle")}
          description={user?.role === "admin" ? t("lessons.noAgeGroupsDescriptionAdmin") : t("lessons.noAgeGroupsDescriptionTeacher")}
        />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="w-16 h-16 rounded-full bg-[var(--color-sage)] text-white flex items-center justify-center mb-4"
        >
          <Check size={28} />
        </motion.div>
        <h2 className="font-display text-2xl font-semibold mb-1">
          {saved === "published" ? t("lessons.lessonPublishedTitle") : t("lessons.draftSavedTitle")}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-sm">
          {saved === "published" ? t("lessons.lessonPublishedDescription") : t("lessons.draftSavedDescription")}
        </p>
        <button onClick={() => router.push("/lessons")} className="text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
          {t("lessons.backToLessonPlans")}
        </button>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div>
        <PageHeader eyebrow={t("lessons.eyebrowCurriculum")} title={t("lessons.chooseTemplateTitle")} description={t("lessons.chooseTemplateDescription")} />
        <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {templates.map((tpl) => (
            <StaggerItem key={tpl.id}>
              <button onClick={() => setSelectedTemplate(tpl.id)} className="w-full text-left h-full">
                <Card className="p-5 h-full flex flex-col">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: `color-mix(in srgb, ${tpl.color} 16%, transparent)`, color: tpl.color }}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="font-display font-semibold mb-1.5">{tpl.name}</h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)] flex-1">{tpl.description}</p>
                </Card>
              </button>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("lessons.eyebrowCurriculum")}
        title={`${t("lessons.newLessonWithTemplatePrefix")}${chosen?.name}`}
        description={t("lessons.fillDetailsDescription")}
        actions={
          <button onClick={() => setSelectedTemplate(null)} className="text-xs font-semibold text-[var(--color-blue-deep)] hover:underline">
            ← {t("lessons.changeTemplate")}
          </button>
        }
      />
      <Card className="p-6 sm:p-8">
        {user && <LessonForm initial={chosen?.data} authorId={user.id} onSaved={setSaved} />}
      </Card>
    </div>
  );
}
