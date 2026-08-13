"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, BookOpen, Users, MessagesSquare, FileText, Image as ImageIcon, UserCircle, CornerDownLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface Result {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: typeof BookOpen;
  category: string;
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const children = useAppStore((s) => s.children);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const posts = useAppStore((s) => s.posts);
  const documentItems = useAppStore((s) => s.documentItems);
  const mediaItems = useAppStore((s) => s.mediaItems);
  const users = useAppStore((s) => s.users);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];

    children.forEach((c) => {
      if (c.name.toLowerCase().includes(q)) {
        out.push({ id: c.id, title: c.name, subtitle: "Child Portfolio", href: `/children/${c.id}`, icon: Users, category: "Children" });
      }
    });
    lessonPlans.forEach((l) => {
      if (l.title.toLowerCase().includes(q) || l.passage.toLowerCase().includes(q) || l.theme.toLowerCase().includes(q)) {
        out.push({ id: l.id, title: l.title, subtitle: l.passage, href: `/lessons/${l.id}`, icon: BookOpen, category: "Lesson Plans" });
      }
    });
    posts.forEach((p) => {
      if (p.content.toLowerCase().includes(q)) {
        out.push({ id: p.id, title: p.type, subtitle: p.content.slice(0, 60) + "…", href: "/updates", icon: MessagesSquare, category: "Teacher Updates" });
      }
    });
    documentItems.forEach((d) => {
      if (d.name.toLowerCase().includes(q)) {
        out.push({ id: d.id, title: d.name, subtitle: d.category, href: "/documents", icon: FileText, category: "Documents" });
      }
    });
    mediaItems.forEach((m) => {
      if (m.name.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q))) {
        out.push({ id: m.id, title: m.name, subtitle: m.folder, href: "/media", icon: ImageIcon, category: "Media" });
      }
    });
    users.forEach((u) => {
      if (u.name.toLowerCase().includes(q) || u.title.toLowerCase().includes(q)) {
        out.push({ id: u.id, title: u.name, subtitle: u.title, href: "/my-class", icon: UserCircle, category: "Teachers" });
      }
    });

    return out.slice(0, 8);
  }, [query, children, lessonPlans, posts, documentItems, mediaItems, users]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl glass-solid rounded-2xl card-shadow-hover overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-soft)]">
              <Search size={18} className="text-[var(--text-secondary)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search children, lessons, updates, documents, media, teachers…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[var(--text-secondary)]">Esc</kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query && results.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-10">No results for "{query}"</p>
              )}
              {!query && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-10">Start typing to search across DWKY Connect…</p>
              )}
              {results.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.category + r.id}
                    onClick={() => {
                      router.push(r.href);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.04] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold-deep)]">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate">{r.title}</p>
                      <p className="text-[11.5px] text-[var(--text-secondary)] truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{r.category}</span>
                    <CornerDownLeft size={13} className="text-[var(--text-secondary)] shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
