"use client";

import { useMemo, useRef, useState } from "react";
import {
  Search,
  UploadCloud,
  Folder,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Presentation,
  Download,
  Tag,
  X,
  Grid3x3,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { mediaFolders } from "@/lib/constants";
import { mediaFolderLabels } from "@/lib/i18n/dictionaries/media";
import { translateApiError } from "@/lib/i18n/errors";
import { formatDate, cn } from "@/lib/utils";
import { uploadToDrive, driveDownloadUrl } from "@/lib/upload";
import type { MediaItem } from "@/lib/types";

const typeIcons: Record<MediaItem["type"], typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  doc: FileText,
  ppt: Presentation,
};

const extToType: Record<string, MediaItem["type"]> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  ppt: "ppt",
  pptx: "ppt",
};

const typeColors: Record<MediaItem["type"], string> = {
  image: "var(--color-gold)",
  video: "var(--color-blue-deep)",
  audio: "var(--color-blue)",
  pdf: "var(--color-gold-deep)",
  doc: "var(--color-sage-deep)",
  ppt: "var(--color-sage)",
};

export default function MediaPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const mediaItems = useAppStore((s) => s.mediaItems);
  const [folder, setFolder] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState(mediaFolders[0]);
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return mediaItems.filter((m) => {
      if (folder && m.folder !== folder) return false;
      if (query && !m.name.toLowerCase().includes(query.toLowerCase()) && !m.tags.some((t) => t.includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [mediaItems, folder, query]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const files = Array.from(e.target.files ?? []);
    const tags = uploadTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const type = extToType[ext] ?? "pdf";
        const uploaded = await uploadToDrive(file, "media");
        await useAppStore.getState().createMediaItem({
          name: uploaded.name,
          folder: uploadFolder,
          type,
          size: uploaded.size,
          uploadedBy: user.id,
          tags,
          color: typeColors[type],
          driveFileId: uploaded.fileId,
          driveViewUrl: uploaded.viewUrl,
        });
      }
      setUploadTags("");
      setUploadOpen(false);
    } catch (err) {
      setUploadError(translateApiError(err, language));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("media.eyebrow")}
        title={t("media.title")}
        description={t("media.description")}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud size={15} /> {t("common.upload")}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-1">
          <button
            onClick={() => setFolder(null)}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
              !folder ? "bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)] text-[var(--color-gold-deep)]" : "hover:bg-black/5 text-[var(--text-secondary)]"
            )}
          >
            <span className="flex items-center gap-2">
              <Folder size={16} /> {t("media.allFiles")}
            </span>
            <span className="text-xs">{mediaItems.length}</span>
          </button>
          {mediaFolders.map((f) => {
            const count = mediaItems.filter((m) => m.folder === f).length;
            return (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                  folder === f ? "bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)] text-[var(--color-gold-deep)]" : "hover:bg-black/5 text-[var(--text-secondary)]"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <Folder size={16} className="shrink-0" /> <span className="truncate">{mediaFolderLabels[language][f]}</span>
                </span>
                <span className="text-xs shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("media.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)]"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl glass">
              <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg", view === "grid" ? "bg-[var(--color-gold)] text-white" : "text-[var(--text-secondary)]")}>
                <Grid3x3 size={15} />
              </button>
              <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg", view === "list" ? "bg-[var(--color-gold)] text-white" : "text-[var(--text-secondary)]")}>
                <List size={15} />
              </button>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-blue)_10%,transparent)] text-sm">
              <span className="font-semibold text-[var(--color-blue-deep)]">{selected.length} {t("media.selected")}</span>
              <Button size="sm" variant="outline" disabled title={t("media.notAvailableTestEnv")}>
                <Download size={13} /> {t("media.bulkDownload")}
              </Button>
              <button onClick={() => setSelected([])} className="ml-auto text-[var(--text-secondary)]">
                <X size={15} />
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={mediaItems.length === 0 ? t("media.noFilesYetTitle") : t("media.noFilesFoundTitle")}
              description={mediaItems.length === 0 ? t("media.noFilesYetDescription") : t("media.noFilesFoundDescription")}
            />
          ) : view === "grid" ? (
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((m) => {
                const Icon = typeIcons[m.type];
                const isSelected = selected.includes(m.id);
                return (
                  <StaggerItem key={m.id}>
                    <Card
                      className={cn("overflow-hidden cursor-pointer relative", isSelected && "ring-2 ring-[var(--color-gold)]")}
                      onClick={() => setPreview(m)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(m.id);
                        }}
                        className={cn(
                          "absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          isSelected ? "bg-[var(--color-gold)] border-[var(--color-gold)]" : "border-white/70 bg-black/10"
                        )}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-sm bg-white" />}
                      </button>
                      <div
                        className="h-28 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 45%, white))` }}
                      >
                        <Icon size={32} className="text-white/90" />
                      </div>
                      <div className="p-3.5">
                        <p className="text-[12.5px] font-semibold truncate">{m.name}</p>
                        <p className="text-[10.5px] text-[var(--text-secondary)] mt-0.5">{m.size} · {formatDate(m.uploadedAt, undefined, language)}</p>
                      </div>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerGrid>
          ) : (
            <StaggerGrid className="space-y-2">
              {filtered.map((m) => {
                const Icon = typeIcons[m.type];
                const uploader = getUser(m.uploadedBy);
                return (
                  <StaggerItem key={m.id}>
                    <Card className="p-3.5 flex items-center gap-3.5 cursor-pointer" onClick={() => setPreview(m)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate">{m.name}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{mediaFolderLabels[language][m.folder]} · {uploader?.name}</p>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] shrink-0 hidden sm:block">{formatDate(m.uploadedAt, undefined, language)}</span>
                      <span className="text-[11px] text-[var(--text-secondary)] shrink-0">{m.size}</span>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerGrid>
          )}
        </div>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} size="md">
        {preview && (
          <div>
            <div className="h-56 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${preview.color}, color-mix(in srgb, ${preview.color} 45%, white))` }}>
              {(() => {
                const Icon = typeIcons[preview.type];
                return <Icon size={56} className="text-white/90" />;
              })()}
            </div>
            <div className="p-6">
              <h3 className="font-display font-semibold text-lg mb-1">{preview.name}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {mediaFolderLabels[language][preview.folder]} · {preview.size} · {t("media.uploadedLabel")} {formatDate(preview.uploadedAt, undefined, language)} {t("media.byLabel")} {getUser(preview.uploadedBy)?.name}
              </p>
              {preview.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-5">
                  {preview.tags.map((t) => (
                    <Badge key={t} tone="gold">
                      <Tag size={10} /> {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {preview.driveFileId ? (
                  <a href={driveDownloadUrl(preview.driveFileId)} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" className="w-full">
                      <Download size={14} /> {t("common.download")}
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" className="flex-1" disabled title={t("media.addedBeforeDrive")}>
                    <Download size={14} /> {t("common.download")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={t("media.uploadModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("media.folderLabel")}</label>
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent">
              {mediaFolders.map((f) => (
                <option key={f} value={f}>
                  {mediaFolderLabels[language][f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("media.tagsLabel")}</label>
            <input
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder={t("media.tagsPlaceholder")}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent"
            />
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-[var(--border-soft)] rounded-2xl py-10 flex flex-col items-center text-center hover:border-[var(--color-gold)] transition-colors disabled:opacity-60"
          >
            <UploadCloud size={28} className={cn("text-[var(--color-gold-deep)] mb-2.5", uploading && "animate-pulse")} />
            <p className="text-sm font-semibold">{uploading ? t("media.uploadingToDrive") : t("media.clickToChooseFiles")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{t("media.fileTypeHint")}</p>
          </button>
          {uploadError && <p className="text-[12px] text-red-500 font-medium">{uploadError}</p>}
          <p className="text-[11px] text-[var(--text-secondary)]">{t("media.driveNote")}</p>
        </div>
      </Modal>
    </div>
  );
}
