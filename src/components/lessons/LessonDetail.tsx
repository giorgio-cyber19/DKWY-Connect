"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  PenLine,
  Paperclip,
  FileText,
  Presentation,
  MonitorPlay,
  Image as ImageIcon,
  History,
  Pencil,
  Target,
  Sparkles,
  MessagesSquare,
  Scissors,
  Music4,
  HandHeart,
  Home,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LessonForm } from "@/components/lessons/LessonForm";
import { getAgeGroup, getUser, useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import type { LessonPlan } from "@/lib/types";

const attachmentIcons = { pdf: FileText, docx: FileText, pptx: Presentation, image: ImageIcon, youtube: MonitorPlay };

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={16} className="text-[var(--color-gold-deep)]" />
        <h3 className="font-display font-semibold text-[15px]">{title}</h3>
      </div>
      <div className="text-[14px] text-[var(--text-primary)] leading-relaxed pl-6">{children}</div>
    </motion.section>
  );
}

export function LessonDetail({ lesson }: { lesson: LessonPlan }) {
  const ageGroup = getAgeGroup(lesson.ageGroupId);
  const author = getUser(lesson.authorId);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const status = lesson.status;

  return (
    <div>
      <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
        <ArrowLeft size={15} /> Back to Lesson Plans
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[24px] p-7 sm:p-9 mb-6 text-white overflow-hidden card-shadow"
        style={{ background: `linear-gradient(120deg, ${lesson.coverColor}, color-mix(in srgb, ${lesson.coverColor} 45%, black))` }}
      >
        <BookOpen size={140} className="absolute -right-6 -bottom-8 text-white/10" />
        <div className="flex items-center gap-2 mb-3">
          <Badge tone={status === "published" ? "sage" : "neutral"} className="bg-white/90 !text-[var(--color-ink)]">
            {status === "published" ? <CheckCircle2 size={11} /> : <PenLine size={11} />}
            {status === "published" ? "Published" : "Draft"}
          </Badge>
          <Badge className="bg-white/20 !text-white">{ageGroup?.name}</Badge>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-2 max-w-2xl">{lesson.title}</h1>
        <p className="text-white/90 text-sm">{lesson.passage} · {lesson.theme}</p>
        <div className="flex items-center gap-3 mt-5">
          <Avatar name={author?.name ?? "?"} color="rgba(255,255,255,0.3)" size="sm" />
          <div className="text-sm">
            <p className="font-semibold">{author?.name}</p>
            <p className="text-white/75 text-xs">{formatDate(lesson.date)}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8 space-y-7">
            <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-gold)_20%,transparent)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-gold-deep)] mb-1">Memory Verse</p>
              <p className="font-display italic text-lg">{lesson.memoryVerse}</p>
            </div>

            <Section icon={Target} title="Learning Objectives">
              <ul className="space-y-1.5 list-disc pl-4">
                {lesson.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Section>

            <Section icon={Sparkles} title="Opening Activity">
              <p>{lesson.openingActivity}</p>
            </Section>

            <Section icon={BookOpen} title="Bible Story">
              <p className="whitespace-pre-wrap">{lesson.bibleStory}</p>
            </Section>

            <Section icon={MessagesSquare} title="Discussion Questions">
              <ol className="space-y-1.5 list-decimal pl-4">
                {lesson.discussionQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </Section>

            <Section icon={Scissors} title="Craft Activity">
              <p>{lesson.craftActivity}</p>
            </Section>

            <Section icon={Music4} title="Worship Songs">
              <div className="flex flex-wrap gap-2">
                {lesson.worshipSongs.map((s) => (
                  <Badge key={s} tone="blue">{s}</Badge>
                ))}
              </div>
            </Section>

            <Section icon={HandHeart} title="Closing Prayer">
              <p className="italic">{lesson.closingPrayer}</p>
            </Section>

            <Section icon={Home} title="Homework / Take-Home">
              <p>{lesson.homework}</p>
            </Section>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Edit Lesson
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => useAppStore.getState().updateLesson(lesson.id, { status: status === "published" ? "draft" : "published" })}
              >
                {status === "published" ? <PenLine size={14} /> : <CheckCircle2 size={14} />}
                {status === "published" ? "Move to Draft" : "Publish Now"}
              </Button>
              <Button variant="ghost" className="w-full" size="sm" onClick={() => setHistoryOpen(true)}>
                <History size={14} /> Version History ({lesson.versions})
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Paperclip size={16} /> Attachments
            </h3>
            <div className="space-y-2">
              {lesson.attachments.map((a) => {
                const Icon = attachmentIcons[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--border-soft)] text-[13px]">
                    <Icon size={16} className="text-[var(--color-blue-deep)] shrink-0" />
                    <span className="truncate">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Lesson Info</h3>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Age Group</dt>
                <dd className="font-medium">{ageGroup?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Date</dt>
                <dd className="font-medium">{formatDate(lesson.date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Last updated</dt>
                <dd className="font-medium">{formatDate(lesson.updatedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Author</dt>
                <dd className="font-medium">{author?.name}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Lesson Plan" size="xl">
        <LessonForm
          initial={lesson}
          lessonId={lesson.id}
          authorId={lesson.authorId}
          onSaved={() => setEditOpen(false)}
        />
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Version History" size="sm">
        <div className="space-y-3">
          {Array.from({ length: lesson.versions }).map((_, i) => {
            const v = lesson.versions - i;
            return (
              <div key={v} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border-soft)]">
                <span className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold-deep)] flex items-center justify-center text-xs font-bold shrink-0">
                  v{v}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{v === lesson.versions ? "Current version" : `Revision ${v}`}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{formatDate(lesson.updatedAt)} by {author?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
