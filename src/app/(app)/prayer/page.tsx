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
import { useLanguage } from "@/lib/language-context";
import { uploadToDrive } from "@/lib/upload";
import { translateApiError } from "@/lib/i18n/errors";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { PrayerEntry } from "@/lib/types";

export default function PrayerPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const entries = useAppStore((s) => s.prayerEntries);

  const tabs = [
    { id: "all", label: t("prayer.tabAll") },
    { id: "Prayer Request", label: t("prayer.tabPrayerRequests") },
    { id: "Praise Report", label: t("prayer.tabPraiseReports") },
    { id: "Devotional", label: t("prayer.tabDevotionals") },
    { id: "Encouragement", label: t("prayer.tabEncouragement") },
  ];
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
      setUploadError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        eyebrow={t("prayer.eyebrow")}
        title={t("prayer.title")}
        description={t("prayer.description")}
      />

      <Card className="p-5 mb-6">
        <div className="flex items-start gap-3">
          <HeartHandshake size={18} className="text-[var(--color-gold-deep)] mt-1.5 shrink-0" />
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("prayer.composerPlaceholder")}
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
                <option value="Prayer Request">{enumLabels.prayerType[language]["Prayer Request"]}</option>
                <option value="Praise Report">{enumLabels.prayerType[language]["Praise Report"]}</option>
                <option value="Devotional">{enumLabels.prayerType[language].Devotional}</option>
                <option value="Encouragement">{enumLabels.prayerType[language].Encouragement}</option>
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
                  title={t("prayer.attachPhotoTitle")}
                >
                  <ImagePlus size={16} />
                </button>
                <button className="p-2 rounded-full hover:bg-black/5 text-[var(--color-blue-deep)]" title={t("prayer.recordVoiceTitle")} disabled>
                  <Mic size={16} />
                </button>
                <Button size="sm" onClick={submit} disabled={!draft.trim() || uploading} loading={uploading}>
                  <Send size={13} /> {t("prayer.shareButton")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={filter} onChange={setFilter} className="mb-6 flex-wrap" />

      {filtered.length === 0 ? (
        <EmptyState icon={HeartHandshake} title={t("prayer.emptyTitle")} description={t("prayer.emptyDescription")} />
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
