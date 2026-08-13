"use client";

import { Trash2, Pin, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { getUser, useAppStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export function AdminModeration() {
  const posts = useAppStore((s) => s.posts);
  const auditLog = useAppStore((s) => s.auditLog);

  function removePost(id: string) {
    useAppStore.getState().removePost(id);
  }

  function togglePin(id: string) {
    useAppStore.getState().togglePinPost(id);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <ShieldAlert size={17} /> Content Moderation
        </h3>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No posts yet.</p>
        ) : (
          <StaggerGrid className="space-y-2.5">
            {posts.map((p) => {
              const author = getUser(p.authorId);
              return (
                <StaggerItem key={p.id}>
                  <Card className="p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size="xs" />
                      <p className="text-[12.5px] font-semibold">{author?.name}</p>
                      <Badge tone="neutral">{p.type}</Badge>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-3">{p.content}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePin(p.id)} className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-gold-deep)]">
                        <Pin size={12} /> {p.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button onClick={() => removePost(p.id)} className="flex items-center gap-1 text-[11.5px] font-semibold text-red-500">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        )}
      </div>

      <div>
        <h3 className="font-display font-semibold text-lg mb-4">Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No activity recorded yet.</p>
        ) : (
          <div className="relative pl-5 space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--border-soft)]">
            {auditLog.map((entry) => (
              <div key={entry.id} className="relative">
                <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-blue)] ring-4 ring-[var(--bg)]" />
                <p className="text-[13px]">
                  <span className="font-semibold">{entry.actor}</span> {entry.action.toLowerCase()} <span className="font-semibold">{entry.target}</span>
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">{timeAgo(entry.date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
