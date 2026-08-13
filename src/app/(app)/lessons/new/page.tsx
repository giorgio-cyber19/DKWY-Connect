"use client";

import { useState } from "react";
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
import { BookX } from "lucide-react";
import type { LessonPlan } from "@/lib/types";

const templates: { id: string; name: string; description: string; color: string; data: Partial<LessonPlan> }[] = [
  {
    id: "blank",
    name: "Blank Lesson",
    description: "Start from a clean slate.",
    color: "var(--color-ink-soft)",
    data: {},
  },
  {
    id: "bible-story",
    name: "Classic Bible Story",
    description: "Opening activity, story time, craft, and closing prayer.",
    color: "var(--color-gold)",
    data: {
      objectives: ["Understand the key truth of today's story", "Apply the lesson to daily life"],
      openingActivity: "Icebreaker game related to today's theme.",
      craftActivity: "Simple hands-on craft reinforcing the story.",
      worshipSongs: ["Opening worship song", "Closing worship song"],
    },
  },
  {
    id: "memory-verse",
    name: "Memory Verse Focus",
    description: "Built around Scripture memorization with games and review.",
    color: "var(--color-blue)",
    data: {
      objectives: ["Memorize this week's verse", "Understand its meaning in context"],
      openingActivity: "Verse repetition game with actions.",
      discussionQuestions: ["What does this verse mean to you?", "How can we live it out this week?"],
    },
  },
  {
    id: "vbs",
    name: "VBS / Special Event",
    description: "High-energy format for VBS days and special programs.",
    color: "var(--color-sage)",
    data: {
      objectives: ["Create a memorable, joyful experience", "Reinforce the week's theme"],
      openingActivity: "Group worship and theme song.",
      craftActivity: "Themed station craft.",
    },
  },
];

export default function NewLessonPage() {
  const router = useRouter();
  const { user } = useAuth();
  const ageGroupCount = useAppStore((s) => s.ageGroups.length);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saved, setSaved] = useState<"draft" | "published" | null>(null);

  const chosen = templates.find((t) => t.id === selectedTemplate);

  if (ageGroupCount === 0) {
    return (
      <div>
        <PageHeader eyebrow="Curriculum" title="New Lesson Plan" />
        <EmptyState
          icon={BookX}
          title="No age groups set up yet"
          description={user?.role === "admin" ? "Create an age group in the Admin panel before writing a lesson plan." : "Ask your administrator to set up an age group before writing a lesson plan."}
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
          {saved === "published" ? "Lesson published!" : "Draft saved!"}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-sm">
          {saved === "published" ? "Your lesson plan is now visible to the teaching team." : "You can come back and finish this lesson anytime."}
        </p>
        <button onClick={() => router.push("/lessons")} className="text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
          Back to Lesson Plans
        </button>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div>
        <PageHeader eyebrow="Curriculum" title="Choose a Lesson Template" description="Start faster with a ready-made structure, or begin from a blank lesson." />
        <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {templates.map((t) => (
            <StaggerItem key={t.id}>
              <button onClick={() => setSelectedTemplate(t.id)} className="w-full text-left h-full">
                <Card className="p-5 h-full flex flex-col">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: `color-mix(in srgb, ${t.color} 16%, transparent)`, color: t.color }}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="font-display font-semibold mb-1.5">{t.name}</h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)] flex-1">{t.description}</p>
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
        eyebrow="Curriculum"
        title={`New Lesson — ${chosen?.name}`}
        description="Fill in the details below. You can save as a draft and come back anytime."
        actions={
          <button onClick={() => setSelectedTemplate(null)} className="text-xs font-semibold text-[var(--color-blue-deep)] hover:underline">
            ← Change template
          </button>
        }
      />
      <Card className="p-6 sm:p-8">
        {user && <LessonForm initial={chosen?.data} authorId={user.id} onSaved={setSaved} />}
      </Card>
    </div>
  );
}
