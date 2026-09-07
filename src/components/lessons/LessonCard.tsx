"use client";

import Link from "next/link";
import { BookOpen, Paperclip, CheckCircle2, PenLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StaggerItem } from "@/components/ui/Stagger";
import { getAgeGroup, getUser } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { LessonPlan } from "@/lib/types";

const ageGroupAccents = ["blue", "gold", "sage"] as const;

function ageGroupAccent(ageGroupId: string | undefined): (typeof ageGroupAccents)[number] {
  if (!ageGroupId) return "blue";
  const sum = ageGroupId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ageGroupAccents[sum % ageGroupAccents.length];
}

export function LessonCard({ lesson }: { lesson: LessonPlan }) {
  const ageGroup = getAgeGroup(lesson.ageGroupId);
  const author = getUser(lesson.authorId);
  const { language } = useLanguage();
  const accent = ageGroupAccent(lesson.ageGroupId);

  return (
    <StaggerItem>
      <Link href={`/lessons/${lesson.id}`}>
        <Card className="overflow-hidden h-full flex flex-col">
          <div
            className="h-[60px] relative flex items-center justify-between px-4"
            style={{ background: `var(--color-${accent}-light)` }}
          >
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: `var(--color-${accent}-deep)` }}>
              <BookOpen size={15} />
              {ageGroup?.name}
            </span>
            <Badge tone={lesson.status === "published" ? "sage" : "neutral"}>
              {lesson.status === "published" ? <CheckCircle2 size={11} /> : <PenLine size={11} />}
              {enumLabels.lessonStatus[language][lesson.status]}
            </Badge>
          </div>
          <div className="p-5 flex flex-col flex-1">
            <h3 className="font-display font-semibold text-[17px] leading-snug mb-1.5 line-clamp-2">{lesson.title}</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">{lesson.passage}</p>
            <div className="mt-auto flex items-center justify-between text-[11.5px] text-[var(--text-secondary)] pt-3 border-t border-[var(--border-softer)]">
              <span>{author?.name.split(" ")[0]} · {formatDate(lesson.date, undefined, language)}</span>
              {lesson.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip size={12} />
                  {lesson.attachments.length}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </StaggerItem>
  );
}
