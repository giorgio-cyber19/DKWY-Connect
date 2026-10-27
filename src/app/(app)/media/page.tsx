"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  UploadCloud,
  FolderUp,
  FolderPlus,
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
  Pencil,
  Trash2,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { formatDate, cn } from "@/lib/utils";
import { hasDraggedFiles, readDroppedContent } from "@/lib/dropped-files";
import { splitFileName } from "@/lib/file-name";
import { uploadToDrive, driveDownloadUrl } from "@/lib/upload";
import type { MediaItem, LibraryFolder } from "@/lib/types";

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
  const allFolders = useAppStore((s) => s.libraryFolders);
  const folders = useMemo(() => allFolders.filter((f) => f.library === "media"), [allFolders]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folderModal, setFolderModal] = useState<{ mode: "create" | "rename"; folder?: LibraryFolder } | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<LibraryFolder | null>(null);
  const [deleteFile, setDeleteFile] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // What the cursor is over while dragging files in: the page ("canvas") or a folder's id.
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<MediaItem | null>(null);
  const [renameBase, setRenameBase] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const menu = useContextMenu();

  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) ?? null : null;

  const filtered = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return mediaItems.filter((m) => m.name.toLowerCase().includes(q) || m.tags.some((tag) => tag.includes(q)));
    }
    return mediaItems.filter((m) => (m.folderId ?? null) === currentFolderId);
  }, [mediaItems, query, currentFolderId]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function openNewFolder() {
    setFolderModal({ mode: "create" });
    setFolderName("");
    setFolderError(null);
  }

  function openRenameFolder(folder: LibraryFolder) {
    setFolderModal({ mode: "rename", folder });
    setFolderName(folder.name);
    setFolderError(null);
  }

  async function submitFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderModal || !folderName.trim()) return;
    setFolderSaving(true);
    setFolderError(null);
    try {
      if (folderModal.mode === "create") {
        await useAppStore.getState().createLibraryFolder(folderName.trim(), "media");
      } else if (folderModal.folder) {
        await useAppStore.getState().renameLibraryFolder(folderModal.folder.id, folderName.trim());
      }
      setFolderModal(null);
    } catch (err) {
      setFolderError(translateApiError(err, language));
    } finally {
      setFolderSaving(false);
    }
  }

  async function confirmDeleteFolder() {
    if (!deleteFolder) return;
    setDeleting(true);
    try {
      await useAppStore.getState().removeLibraryFolder(deleteFolder.id);
      if (currentFolderId === deleteFolder.id) setCurrentFolderId(null);
      setDeleteFolder(null);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteFile() {
    if (!deleteFile) return;
    setDeleting(true);
    try {
      await useAppStore.getState().removeMediaItem(deleteFile.id);
      setSelected((prev) => prev.filter((id) => id !== deleteFile.id));
      setDeleteFile(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleFiles(fileList: FileList | File[] | null, targetFolder: LibraryFolder | null) {
    if (!user || !fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const type = extToType[ext] ?? "pdf";
        const uploaded = await uploadToDrive(file, "media", undefined, targetFolder?.driveFolderId);
        await useAppStore.getState().createMediaItem({
          name: uploaded.name,
          folderId: targetFolder?.id ?? null,
          type,
          size: uploaded.size,
          uploadedBy: user.id,
          tags: [],
          color: typeColors[type],
          driveFileId: uploaded.fileId,
          driveViewUrl: uploaded.viewUrl,
        });
      }
    } catch (err) {
      setUploadError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  async function handleFolderPick(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!user || !fileList || fileList.length === 0) {
      e.target.value = "";
      return;
    }
    const first = fileList[0] as File & { webkitRelativePath?: string };
    const folderName = first.webkitRelativePath?.split("/")[0] || "Untitled folder";
    setUploading(true);
    setUploadError(null);
    try {
      const created = await useAppStore.getState().createLibraryFolder(folderName, "media");
      await handleFiles(fileList, created);
    } catch (err) {
      setUploadError(translateApiError(err, language));
      setUploading(false);
    } finally {
      e.target.value = "";
    }
  }

  function openRenameFile(item: MediaItem) {
    setRenameTarget(item);
    setRenameBase(splitFileName(item.name).base);
    setRenameError(null);
  }

  /** Renames the file in Google Drive and in the app; the extension stays as it was. */
  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget || !renameBase.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await useAppStore.getState().renameMediaItem(renameTarget.id, renameBase.trim() + splitFileName(renameTarget.name).ext);
      setRenameTarget(null);
    } catch (err) {
      setRenameError(translateApiError(err, language));
    } finally {
      setRenaming(false);
    }
  }

  function isSupportedFile(file: File): boolean {
    return (file.name.split(".").pop() ?? "").toLowerCase() in extToType;
  }

  /** Files or folders dropped from the computer: loose files go into `target`; each dropped folder becomes (or reuses) a library folder. */
  async function handleDrop(e: React.DragEvent, target: LibraryFolder | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
    if (!user || !hasDraggedFiles(e.dataTransfer)) return;

    const content = await readDroppedContent(e.dataTransfer); // reads synchronously before its first await
    setDropNotice(null);
    setUploadError(null);

    const loose = content.files.filter(isSupportedFile);
    const droppedFolders = content.folders.map((d) => ({ name: d.name, files: d.files.filter(isSupportedFile) })).filter((d) => d.files.length > 0);
    const skipped = content.files.filter((f) => !isSupportedFile(f)).length + content.folders.reduce((n, d) => n + d.files.filter((f) => !isSupportedFile(f)).length, 0);

    if (loose.length > 0) await handleFiles(loose, target);
    for (const dropped of droppedFolders) {
      try {
        const existing = folders.find((f) => f.name.toLowerCase() === dropped.name.toLowerCase());
        const folder = existing ?? (await useAppStore.getState().createLibraryFolder(dropped.name, "media"));
        await handleFiles(dropped.files, folder);
      } catch (err) {
        setUploadError(translateApiError(err, language));
      }
    }
    if (skipped > 0) setDropNotice(`${skipped} ${t("library.skippedUnsupported")}`);
  }

  // A file dropped outside a drop zone would make the browser open it and leave the app — stop that.
  useEffect(() => {
    const stop = (ev: DragEvent) => {
      if (hasDraggedFiles(ev.dataTransfer)) ev.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  function openFilesPicker() {
    filesInputRef.current?.click();
  }

  function openFolderPicker() {
    folderInputRef.current?.click();
  }

  function canvasMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    if (!currentFolderId) {
      items.push({ label: t("library.newFolder"), icon: <FolderPlus size={15} />, onClick: openNewFolder });
    }
    items.push({ label: t("library.uploadFiles"), icon: <UploadCloud size={15} />, onClick: openFilesPicker });
    if (!currentFolderId) {
      items.push({ label: t("library.uploadFolder"), icon: <FolderUp size={15} />, onClick: openFolderPicker });
    }
    return items;
  }

  function folderMenuItems(folder: LibraryFolder): ContextMenuItem[] {
    return [
      { label: t("library.open"), icon: <Folder size={15} />, onClick: () => setCurrentFolderId(folder.id) },
      { label: t("library.rename"), icon: <Pencil size={15} />, onClick: () => openRenameFolder(folder) },
      { label: t("library.delete"), icon: <Trash2 size={15} />, onClick: () => setDeleteFolder(folder), destructive: true, separator: true },
    ];
  }

  function fileMenuItems(item: MediaItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [{ label: t("library.open"), icon: <Folder size={15} />, onClick: () => setPreview(item) }];
    if (item.driveFileId) {
      items.push({
        label: t("library.download"),
        icon: <Download size={15} />,
        onClick: () => window.open(driveDownloadUrl(item.driveFileId!), "_blank"),
      });
    }
    items.push({ label: t("library.rename"), icon: <Pencil size={15} />, onClick: () => openRenameFile(item) });
    items.push({ label: t("library.delete"), icon: <Trash2 size={15} />, onClick: () => setDeleteFile(item), destructive: true, separator: true });
    return items;
  }

  const showFolders = !currentFolderId && !query.trim();

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-[20px] p-5 sm:p-6">
      <PageHeader
        eyebrow={t("media.eyebrow")}
        title={t("media.title")}
        description={t("media.description")}
        actions={
          <Button onClick={(e) => menu.open(e, canvasMenuItems())}>
            <Plus size={15} /> {t("library.add")}
          </Button>
        }
      />

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
        {!query.trim() && currentFolder && (
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <ChevronLeft size={15} /> {t("library.backToAllFiles")} <span className="text-[var(--color-ink-faint)]">/</span> {currentFolder.name}
          </button>
        )}
        <div className="flex items-center gap-1 p-1 rounded-xl glass shrink-0">
          <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg", view === "grid" ? "bg-[var(--color-gold)] text-white" : "text-[var(--text-secondary)]")}>
            <Grid3x3 size={15} />
          </button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg", view === "list" ? "bg-[var(--color-gold)] text-white" : "text-[var(--text-secondary)]")}>
            <List size={15} />
          </button>
        </div>
      </div>

      {uploadError && <p className="text-xs text-red-500 font-medium mb-4">{uploadError}</p>}
      {uploading && <p className="text-xs text-[var(--text-secondary)] mb-4">{t("media.uploadingToDrive")}</p>}
      {dropNotice && <p className="text-xs text-[var(--text-secondary)] mb-4">{dropNotice}</p>}

      <input
        ref={filesInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files, currentFolder);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error -- non-standard attributes with no React typing, needed for folder picking
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderPick}
      />

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

      <div
        className={cn(
          "relative min-h-[240px] rounded-2xl transition-colors",
          dragTarget === "canvas" && "outline-2 outline-dashed outline-[var(--color-blue)] bg-[color-mix(in_srgb,var(--color-blue)_6%,transparent)]"
        )}
        onContextMenu={(e) => menu.open(e, canvasMenuItems())}
        onDragOver={(e) => {
          if (!hasDraggedFiles(e.dataTransfer)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragTarget("canvas");
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragTarget(null);
        }}
        onDrop={(e) => handleDrop(e, currentFolder)}
      >
        {dragTarget === "canvas" && (
          <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center">
            <span className="px-4 py-2 rounded-xl bg-[var(--color-blue)] text-white text-sm font-semibold shadow-lg">
              {currentFolder ? `${t("library.dropIntoFolder")} “${currentFolder.name}”` : t("library.dropToUpload")}
            </span>
          </div>
        )}
        {showFolders && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">{t("library.foldersLabel")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {folders.map((f) => {
                const count = mediaItems.filter((m) => m.folderId === f.id).length;
                return (
                  <Card
                    key={f.id}
                    className={cn("p-4 flex items-center gap-3 cursor-pointer", dragTarget === f.id && "ring-2 ring-[var(--color-blue)]")}
                    onClick={() => setCurrentFolderId(f.id)}
                    onContextMenu={(e) => menu.open(e, folderMenuItems(f))}
                    onDragOver={(e) => {
                      if (!hasDraggedFiles(e.dataTransfer)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "copy";
                      setDragTarget(f.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragTarget(null);
                    }}
                    onDrop={(e) => handleDrop(e, f)}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[var(--color-gold-deep)]">
                      <Folder size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{f.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{count} {t("library.itemCount")}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={currentFolderId ? t("library.emptyFolderTitle") : mediaItems.length === 0 ? t("media.noFilesYetTitle") : t("media.noFilesFoundTitle")}
            description={
              currentFolderId
                ? t("library.emptyFolderDescription")
                : mediaItems.length === 0
                  ? t("library.rightClickHint")
                  : t("media.noFilesFoundDescription")
            }
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
                    onContextMenu={(e) => menu.open(e, fileMenuItems(m))}
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
              const folder = query.trim() ? folders.find((f) => f.id === m.folderId) : null;
              return (
                <StaggerItem key={m.id}>
                  <Card className="p-3.5 flex items-center gap-3.5 cursor-pointer" onClick={() => setPreview(m)} onContextMenu={(e) => menu.open(e, fileMenuItems(m))}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate">{m.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{uploader?.name}{folder && <> · {folder.name}</>}</p>
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

      {menu.state && <ContextMenu x={menu.state.x} y={menu.state.y} items={menu.state.items} onClose={menu.close} />}

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
                {preview.size} · {t("media.uploadedLabel")} {formatDate(preview.uploadedAt, undefined, language)} {t("media.byLabel")} {getUser(preview.uploadedBy)?.name}
              </p>
              {preview.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-5">
                  {preview.tags.map((tag) => (
                    <Badge key={tag} tone="gold">
                      <Tag size={10} /> {tag}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeleteFile(preview);
                    setPreview(null);
                  }}
                >
                  <Trash2 size={14} /> {t("library.delete")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!folderModal} onClose={() => setFolderModal(null)} title={folderModal?.mode === "rename" ? t("library.renameFolderTitle") : t("library.newFolderTitle")} size="sm">
        <form onSubmit={submitFolder} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("library.folderNameLabel")}</label>
            <input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t("library.folderNamePlaceholder")}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
            />
          </div>
          {folderError && <p className="text-[12px] text-red-500 font-medium">{folderError}</p>}
          <Button type="submit" className="w-full" loading={folderSaving} disabled={!folderName.trim()}>
            {folderModal?.mode === "rename" ? t("library.saveRename") : t("library.create")}
          </Button>
        </form>
      </Modal>

      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title={t("library.renameFileTitle")} size="sm">
        <form onSubmit={submitRename} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("library.fileNameLabel")}</label>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={renameBase}
                onChange={(e) => setRenameBase(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
              {renameTarget && splitFileName(renameTarget.name).ext && (
                <span className="text-sm font-semibold text-[var(--text-secondary)] shrink-0">{splitFileName(renameTarget.name).ext}</span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">{t("library.renameFileNote")}</p>
          </div>
          {renameError && <p className="text-[12px] text-red-500 font-medium">{renameError}</p>}
          <Button type="submit" className="w-full" loading={renaming} disabled={!renameBase.trim() || renaming}>
            {t("library.saveRename")}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        onConfirm={confirmDeleteFolder}
        title={t("library.deleteFolderTitle")}
        message={t("library.deleteFolderMessage")}
        confirming={deleting}
      />

      <ConfirmDialog
        open={!!deleteFile}
        onClose={() => setDeleteFile(null)}
        onConfirm={confirmDeleteFile}
        title={t("library.deleteFileTitle")}
        message={t("library.deleteFileMessage")}
        confirming={deleting}
      />
    </div>
  );
}
