"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LessonDetail } from "@/components/lessons/LessonDetail";
import { EmptyState } from "@/components/ui/EmptyState";

export default function LessonPage(props: PageProps<"/lessons/[id]">) {
  const { id } = use(props.params);
  const hydrated = useAppStore((s) => s.hydrated);
  const lesson = useAppStore((s) => s.lessonPlans.find((l) => l.id === id));

  if (!hydrated) return null;

  if (!lesson) {
    return (
      <div>
        <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft size={15} /> Back to Lesson Plans
        </Link>
        <EmptyState icon={BookX} title="Lesson plan not found" description="It may have been removed, or the link is out of date." />
      </div>
    );
  }

  return <LessonDetail lesson={lesson} />;
}
