"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, BarChart3, Send, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useAppStore } from "@/lib/store";
import type { Post } from "@/lib/types";

const types: Post["type"][] = ["Weekly Update", "Announcement", "Testimony", "Prayer Request", "Teaching Tip", "Event Reminder", "Photo"];

export function PostComposer() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [type, setType] = useState<Post["type"]>("Weekly Update");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [addPhoto, setAddPhoto] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().createPost({
        authorId: user!.id,
        type,
        content,
        imageColor: addPhoto ? "var(--color-gold-light)" : undefined,
        poll:
          showPoll && pollQuestion.trim()
            ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()).map((o) => ({ text: o, votes: 0 })), votesByUser: {} }
            : undefined,
      });
      setContent("");
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setAddPhoto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post. Please try again.");
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
            placeholder="Share an update, announcement, or prayer request with your fellow teachers…"
            rows={2}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-[var(--text-secondary)]"
          />

          {addPhoto && (
            <div className="relative h-32 rounded-2xl bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-blue-light)]">
              <button onClick={() => setAddPhoto(false)} className="absolute top-2 right-2 p-1 rounded-full bg-black/20 text-white">
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
                  placeholder="Poll question…"
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
                  placeholder={`Option ${i + 1}`}
                  className="w-full text-[13px] px-3 py-1.5 rounded-lg border border-[var(--border-soft)] bg-transparent outline-none"
                />
              ))}
              <button onClick={() => setPollOptions((prev) => [...prev, ""])} className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                + Add option
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
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setAddPhoto((v) => !v)}
                className="p-2 rounded-full hover:bg-black/5 text-[var(--color-sage-deep)]"
                title="Add photo"
              >
                <ImageIcon size={16} />
              </button>
              <button
                onClick={() => setShowPoll((v) => !v)}
                className="p-2 rounded-full hover:bg-black/5 text-[var(--color-blue-deep)]"
                title="Add poll"
              >
                <BarChart3 size={16} />
              </button>
            </div>
            <Button size="sm" onClick={submit} loading={submitting} disabled={!content.trim() || submitting}>
              <Send size={13} /> Post
            </Button>
          </div>
          {error && <p className="text-[11.5px] text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
