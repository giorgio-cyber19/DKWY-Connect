"use client";

import { Pin, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCard } from "@/components/updates/PostCard";
import { PostComposer } from "@/components/updates/PostComposer";
import { useAppStore } from "@/lib/store";

export default function UpdatesPage() {
  const posts = useAppStore((s) => s.posts);

  const pinned = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader eyebrow="Community" title="Teacher Updates" description="Announcements, encouragement, and everyday moments from your Sunday School team." />

      <div className="space-y-5">
        <PostComposer />

        {pinned.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-gold-deep)] mb-3">
              <Pin size={12} /> Pinned
            </p>
            <StaggerGrid className="space-y-5">
              {pinned.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </StaggerGrid>
          </div>
        )}

        {posts.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No updates yet" description="Be the first to share an announcement, testimony, or prayer request with the team." />
        ) : (
          <StaggerGrid className="space-y-5">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </StaggerGrid>
        )}
      </div>
    </div>
  );
}
