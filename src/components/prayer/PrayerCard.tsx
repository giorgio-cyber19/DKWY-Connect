"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HandHeart, Play, Quote, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StaggerItem } from "@/components/ui/Stagger";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { timeAgo } from "@/lib/utils";
import { driveDownloadUrl } from "@/lib/upload";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { PrayerEntry } from "@/lib/types";

const typeTone = {
  "Prayer Request": "gold",
  "Praise Report": "sage",
  Devotional: "blue",
  Encouragement: "gold",
} as const;

export function PrayerCard({ entry }: { entry: PrayerEntry }) {
  const author = getUser(entry.authorId);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const prayed = !!user && entry.prayedByUserIds.includes(user.id);
  const count = entry.prayedByUserIds.length;

  if (!author) return null;

  return (
    <StaggerItem>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Avatar name={author.name} color={author.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{author.name}</p>
            <div className="flex items-center gap-2">
              <Badge tone={typeTone[entry.type]}>{enumLabels.prayerType[language][entry.type]}</Badge>
              <span className="text-[11px] text-[var(--text-secondary)]">{timeAgo(entry.date, language)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 relative pl-4">
          <Quote size={26} className="absolute -left-0.5 -top-1 text-[var(--color-gold-light)] opacity-60" />
          <p className="text-[14px] leading-relaxed italic pl-3">{entry.content}</p>
        </div>

        {entry.driveFileId && (
          <a
            href={driveDownloadUrl(entry.driveFileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-sage)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] transition-colors text-[12.5px] font-medium text-[var(--color-sage-deep)]"
          >
            <ImageIcon size={15} /> {t("prayer.viewAttachedPhoto")}
          </a>
        )}

        {entry.hasVoiceNote && (
          <button
            onClick={() => setPlaying((p) => !p)}
            className="mt-3.5 flex items-center gap-3 w-full px-4 py-2.5 rounded-full bg-[color-mix(in_srgb,var(--color-blue)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-blue)_16%,transparent)] transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-[var(--color-blue-deep)] text-white flex items-center justify-center shrink-0">
              <Play size={12} fill="white" />
            </span>
            <span className="flex-1 flex items-center gap-0.5 h-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={playing ? { height: [4, 12 + (i % 5) * 2, 4] } : { height: 4 + (i % 5) }}
                  transition={playing ? { duration: 0.8, repeat: Infinity, delay: i * 0.03 } : undefined}
                  className="w-[2px] rounded-full bg-[var(--color-blue-deep)] opacity-70"
                />
              ))}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] shrink-0">{entry.voiceDuration}</span>
          </button>
        )}

        <button
          onClick={() => user && useAppStore.getState().togglePrayedFor(entry.id, user.id)}
          className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-colors ${
            prayed
              ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold-deep)]"
              : "border-[var(--border-soft)] hover:border-[var(--color-gold-light)]"
          }`}
        >
          <motion.span whileTap={{ scale: 1.3 }}>
            <HandHeart size={15} />
          </motion.span>
          {prayed ? t("prayer.prayedForThis") : t("prayer.prayForThis")} · {count}
        </button>
      </Card>
    </StaggerItem>
  );
}
