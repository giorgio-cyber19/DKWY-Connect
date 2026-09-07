"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, BarChart3, Send, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import { translateApiError } from "@/lib/i18n/errors";
import { uploadToDrive } from "@/lib/upload";
import type { Post } from "@/lib/types";

const types: Post["type"][] = ["Update", "Announcement", "Photo", "Devotional", "Prayer"];

export function PostComposer() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [content, setContent] = useState("");
  const [type, setType] = useState<Post["type"]>("Update");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const uploaded = photo ? await uploadToDrive(photo, "encouragements") : undefined;
      await useAppStore.getState().createPost({
        authorId: user!.id,
        type,
        content,
        driveFileId: uploaded?.fileId,
        driveViewUrl: uploaded?.viewUrl,
        poll:
          showPoll && pollQuestion.trim()
            ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()).map((o) => ({ text: o, votes: 0 })), votesByUser: {} }
            : undefined,
      });
      setContent("");
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPhoto(null);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <Avatar name={user.name} color={user.avatarColor} size="md" />
        <div className="flex-1 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("updates.composerPlaceholder")}
            rows={2}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-[var(--text-secondary)]"
          />

          {photo && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] text-[12.5px]">
              <span className="flex-1 truncate">{photo.name}</span>
              <button onClick={() => setPhoto(null)} className="text-[var(--text-secondary)] hover:text-red-500">
                <X size={13} />
              </button>
            </div>
          )}

          {showPoll && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3.5 rounded-2xl border border-[var(--border-soft)] space-y-2">
              <div className="flex items-center justify-between">
                <input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder={t("updates.pollQuestionPlaceholder")}
                  className="flex-1 text-sm bg-transparent outline-none font-medium"
                />
                <button onClick={() => setShowPoll(false)} className="text-[var(--text-secondary)]">
                  <X size={14} />
                </button>
              </div>
              {pollOptions.map((o, i) => (
                <input
                  key={i}
                  value={o}
                  onChange={(e) => setPollOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                  placeholder={`${t("updates.optionLabel")} ${i + 1}`}
                  className="w-full text-[13px] px-3 py-1.5 rounded-lg border border-[var(--border-soft)] bg-transparent outline-none"
                />
              ))}
              <button onClick={() => setPollOptions((prev) => [...prev, ""])} className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                {t("updates.addOption")}
              </button>
            </motion.div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Post["type"])}
                className="text-[12px] font-semibold px-2.5 py-1.5 rounded-full border border-[var(--border-soft)] bg-transparent"
              >
                {types.map((typeValue) => (
                  <option key={typeValue} value={typeValue}>
                    {enumLabels.postType[language][typeValue]}
                  </option>
                ))}
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-black/5 text-[var(--color-sage-deep)]"
                title={t("updates.addPhotoTitle")}
              >
                <ImageIcon size={16} />
              </button>
              <button
                onClick={() => setShowPoll((v) => !v)}
                className="p-2 rounded-full hover:bg-black/5 text-[var(--color-blue-deep)]"
                title={t("updates.addPollTitle")}
              >
                <BarChart3 size={16} />
              </button>
            </div>
            <Button size="sm" onClick={submit} loading={submitting} disabled={!content.trim() || submitting}>
              <Send size={13} /> {t("updates.postButton")}
            </Button>
          </div>
          {error && <p className="text-[11.5px] text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
