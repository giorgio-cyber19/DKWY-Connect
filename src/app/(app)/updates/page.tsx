"use client";

import { Pin, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCard } from "@/components/updates/PostCard";
import { PostComposer } from "@/components/updates/PostComposer";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";

export default function UpdatesPage() {
  const posts = useAppStore((s) => s.posts);
  const { t } = useLanguage();

  const pinned = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader eyebrow={t("updates.eyebrow")} title={t("updates.title")} description={t("updates.description")} />

      <div className="space-y-5">
        <PostComposer />

        {pinned.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-gold-deep)] mb-3">
              <Pin size={12} /> {t("updates.pinned")}
            </p>
            <StaggerGrid className="space-y-5">
              {pinned.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </StaggerGrid>
          </div>
        )}

        {posts.length === 0 ? (
          <EmptyState icon={MessagesSquare} title={t("updates.emptyTitle")} description={t("updates.emptyDescription")} />
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
