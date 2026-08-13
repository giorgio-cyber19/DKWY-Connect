"use client";

import { useRef, useState } from "react";
import { Mic, Send, HeartHandshake, ImagePlus, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrayerCard } from "@/components/prayer/PrayerCard";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { uploadToDrive, DriveNotConfiguredError } from "@/lib/upload";
import type { PrayerEntry } from "@/lib/types";

const tabs = [
  { id: "all", label: "All" },
  { id: "Prayer Request", label: "Prayer Requests" },
  { id: "Praise Report", label: "Praise Reports" },
  { id: "Devotional", label: "Devotionals" },
  { id: "Encouragement", label: "Encouragement" },
];

export default function PrayerPage() {
  const { user } = useAuth();
  const entries = useAppStore((s) => s.prayerEntries);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [type, setType] = useState<PrayerEntry["type"]>("Prayer Request");
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  async function submit() {
    if (!draft.trim() || !user) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = photo ? await uploadToDrive(photo, "encouragements") : undefined;
      await useAppStore.getState().createPrayerEntry({
        authorId: user.id,
        type,
        content: draft.trim(),
        driveFileId: uploaded?.fileId,
        driveViewUrl: uploaded?.viewUrl,
      });
      setDraft("");
      setPhoto(null);
    } catch (err) {
      setUploadError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Ministry Heart"
        title="Prayer & Encouragement"
        description="A dedicated space for teachers to share prayer needs, celebrate answered prayer, and encourage one another."
      />

      <Card className="p-5 mb-6">
        <div className="flex items-start gap-3">
          <HeartHandshake size={18} className="text-[var(--color-gold-deep)] mt-1.5 shrink-0" />
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share a prayer request, a praise report, or a word of encouragement…"
              rows={2}
              className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-[var(--text-secondary)]"
            />
            {photo && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-black/[0.03] text-[12.5px]">
                <span className="flex-1 truncate">{photo.name}</span>
                <button onClick={() => setPhoto(null)} className="text-[var(--text-secondary)] hover:text-red-500">
                  <X size={13} />
                </button>
              </div>
            )}
            {uploadError && <p className="text-[11.5px] text-red-500 font-medium mt-2">{uploadError}</p>}
            <div className="flex items-center justify-between mt-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PrayerEntry["type"])}
                className="text-[12px] font-semibold px-2.5 py-1.5 rounded-full border border-[var(--border-soft)] bg-transparent"
              >
                <option>Prayer Request</option>
                <option>Praise Report</option>
                <option>Devotional</option>
                <option>Encouragement</option>
              </select>
              <div className="flex items-center gap-2">
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
                  title="Attach a photo"
                >
                  <ImagePlus size={16} />
                </button>
                <button className="p-2 rounded-full hover:bg-black/5 text-[var(--color-blue-deep)]" title="Record voice message (not available yet)" disabled>
                  <Mic size={16} />
                </button>
                <Button size="sm" onClick={submit} disabled={!draft.trim() || uploading} loading={uploading}>
                  <Send size={13} /> Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={filter} onChange={setFilter} className="mb-6 flex-wrap" />

      {filtered.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Nothing here yet" description="Share the first prayer request, praise report, or word of encouragement." />
      ) : (
        <StaggerGrid className="space-y-5">
          {filtered.map((e) => (
            <PrayerCard key={e.id} entry={e} />
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
