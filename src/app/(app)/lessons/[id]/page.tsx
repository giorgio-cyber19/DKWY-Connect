"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LessonDetail } from "@/components/lessons/LessonDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/language-context";

export default function LessonPage(props: PageProps<"/lessons/[id]">) {
  const { id } = use(props.params);
  const hydrated = useAppStore((s) => s.hydrated);
  const lesson = useAppStore((s) => s.lessonPlans.find((l) => l.id === id));
  const { t } = useLanguage();

  if (!hydrated) return null;

  if (!lesson) {
    return (
      <div>
        <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft size={15} /> {t("lessons.backToLessonPlans")}
        </Link>
        <EmptyState icon={BookX} title={t("lessons.lessonNotFoundTitle")} description={t("lessons.lessonNotFoundDescription")} />
      </div>
    );
  }

  return <LessonDetail lesson={lesson} />;
}
