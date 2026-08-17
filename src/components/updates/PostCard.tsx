"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pin, MessageCircle, Send, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StaggerItem } from "@/components/ui/Stagger";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import { timeAgo, cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

const typeTone: Record<Post["type"], "gold" | "blue" | "sage" | "neutral"> = {
  Announcement: "gold",
  "Weekly Update": "blue",
  Testimony: "sage",
  "Prayer Request": "gold",
  "Teaching Tip": "blue",
  "Event Reminder": "neutral",
  Photo: "sage",
};

const QUICK_REACTIONS = ["❤️", "🙌", "🙏", "😂"];

export function PostCard({ post, compact }: { post: Post; compact?: boolean }) {
  const author = getUser(post.authorId);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const totalVotes = post.poll?.options.reduce((s, o) => s + o.votes, 0) ?? 0;
  const myVoteIndex = user && post.poll ? post.poll.votesByUser[user.id] : undefined;

  function toggleReaction(emoji: string) {
    if (!user) return;
    useAppStore.getState().toggleReaction(post.id, emoji, user.id);
  }

  function addComment() {
    if (!commentText.trim() || !user) return;
    useAppStore.getState().addComment(post.id, user.id, commentText.trim());
    setCommentText("");
  }

  function vote(i: number) {
    if (!user || myVoteIndex !== undefined) return;
    useAppStore.getState().votePoll(post.id, user.id, i);
  }

  if (!author) return null;

  return (
    <StaggerItem>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Avatar name={author.name} color={author.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{author.name}</p>
              <span className="text-[11px] text-[var(--text-secondary)]">{author.title}</span>
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--color-gold-deep)]">
                  <Pin size={11} /> {t("updates.pinned")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge tone={typeTone[post.type]}>{enumLabels.postType[language][post.type]}</Badge>
              <span className="text-[11px] text-[var(--text-secondary)]">{timeAgo(post.date, language)}</span>
            </div>
          </div>
        </div>

        <p className="text-[14px] leading-relaxed mt-3.5 whitespace-pre-wrap">{post.content}</p>

        {post.imageColor && (
          <div
            className="mt-3.5 h-44 rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${post.imageColor}, color-mix(in srgb, ${post.imageColor} 50%, white))` }}
          />
        )}

        {post.poll && (
          <div className="mt-3.5 p-4 rounded-2xl border border-[var(--border-soft)] space-y-2.5">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <BarChart3 size={14} className="text-[var(--color-blue-deep)]" />
              {post.poll.question}
            </p>
            {post.poll.options.map((o, i) => {
              const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
              return (
                <button
                  key={o.text}
                  onClick={() => vote(i)}
                  disabled={myVoteIndex !== undefined}
                  className="w-full text-left relative overflow-hidden rounded-xl border border-[var(--border-soft)] px-3 py-2 text-[13px] disabled:cursor-default"
                >
                  {myVoteIndex !== undefined && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-blue)_18%,transparent)]"
                    />
                  )}
                  <span className="relative flex items-center justify-between">
                    <span>{o.text}</span>
                    {myVoteIndex !== undefined && <span className="text-[11px] font-semibold">{pct}%</span>}
                  </span>
                </button>
              );
            })}
            <p className="text-[11px] text-[var(--text-secondary)]">{totalVotes} {t("updates.votesLabel")}</p>
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[var(--border-softer)]">
            <div className="flex items-center gap-1.5">
              {QUICK_REACTIONS.map((emoji) => {
                const reaction = post.reactions.find((r) => r.emoji === emoji);
                const count = reaction?.userIds.length ?? 0;
                const reacted = !!user && !!reaction?.userIds.includes(user.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-medium border transition-colors",
                      reacted
                        ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]"
                        : "border-[var(--border-soft)] hover:border-[var(--color-gold-light)]"
                    )}
                  >
                    <motion.span whileTap={{ scale: 1.4 }} className="inline-block">
                      {emoji}
                    </motion.span>
                    {count > 0 && count}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowComments((s) => !s)}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <MessageCircle size={15} />
              {post.comments.length}
            </button>
          </div>
        )}

        {!compact && showComments && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3.5 space-y-3">
            {post.comments.map((c) => {
              const cAuthor = getUser(c.authorId);
              return (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar name={cAuthor?.name ?? "?"} color={cAuthor?.avatarColor} size="xs" />
                  <div className="flex-1 bg-black/[0.03] rounded-2xl px-3.5 py-2">
                    <p className="text-[12px] font-semibold">{cAuthor?.name}</p>
                    <p className="text-[13px]">{c.text}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder={t("updates.commentPlaceholder")}
                className="flex-1 text-[13px] px-3.5 py-2 rounded-full border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
              <button onClick={addComment} className="p-2 rounded-full bg-[var(--color-gold)] text-white">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </Card>
    </StaggerItem>
  );
}
