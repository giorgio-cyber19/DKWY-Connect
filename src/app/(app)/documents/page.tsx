"use client";

import { useMemo, useRef, useState } from "react";
import {
  Search,
  UploadCloud,
  FolderUp,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  FileType2,
  Download,
  Folder,
  Pencil,
  Trash2,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { uploadToDrive, driveDownloadUrl } from "@/lib/upload";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import type { DocumentItem, LibraryFolder } from "@/lib/types";

const fileIcons: Record<DocumentItem["fileType"], typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  xlsx: FileSpreadsheet,
};

const fileColors: Record<DocumentItem["fileType"], string> = {
  pdf: "var(--color-gold-deep)",
  docx: "var(--color-blue-deep)",
  xlsx: "var(--color-sage-deep)",
};

const extToFileType: Record<string, DocumentItem["fileType"]> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  xls: "xlsx",
  xlsx: "xlsx",
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const documentItems = useAppStore((s) => s.documentItems);
  const allFolders = useAppStore((s) => s.libraryFolders);
  const folders = useMemo(() => allFolders.filter((f) => f.library === "documents"), [allFolders]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [folderModal, setFolderModal] = useState<{ mode: "create" | "rename"; folder?: LibraryFolder } | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<LibraryFolder | null>(null);
  const [deleteFile, setDeleteFile] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const menu = useContextMenu();

  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) ?? null : null;

  const filtered = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return documentItems.filter((d) => d.name.toLowerCase().includes(q));
    }
    return documentItems.filter((d) => (d.folderId ?? null) === currentFolderId);
  }, [documentItems, query, currentFolderId]);

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
        await useAppStore.getState().createLibraryFolder(folderName.trim(), "documents");
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
      await useAppStore.getState().removeDocumentItem(deleteFile.id);
      setDeleteFile(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleFiles(fileList: FileList | null, targetFolder: LibraryFolder | null) {
    if (!user || !fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uploaded = await uploadToDrive(file, "documents", undefined, targetFolder?.driveFolderId);
        await useAppStore.getState().createDocumentItem({
          name: uploaded.name,
          folderId: targetFolder?.id ?? null,
          fileType: extToFileType[ext] ?? "pdf",
          size: uploaded.size,
          uploadedBy: user.id,
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
      const created = await useAppStore.getState().createLibraryFolder(folderName, "documents");
      await handleFiles(fileList, created);
    } catch (err) {
      setUploadError(translateApiError(err, language));
      setUploading(false);
    } finally {
      e.target.value = "";
    }
  }

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

  function fileMenuItems(item: DocumentItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    if (item.driveFileId) {
      items.push({
        label: t("library.download"),
        icon: <Download size={15} />,
        onClick: () => window.open(driveDownloadUrl(item.driveFileId!), "_blank"),
      });
    }
    items.push({ label: t("library.delete"), icon: <Trash2 size={15} />, onClick: () => setDeleteFile(item), destructive: true });
    return items;
  }

  const showFolders = !currentFolderId && !query.trim();

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-[20px] p-5 sm:p-6">
      <PageHeader
        eyebrow={t("documents.eyebrow")}
        title={t("documents.title")}
        description={t("documents.description")}
        actions={
          <Button onClick={(e) => menu.open(e, canvasMenuItems())}>
            <Plus size={15} /> {t("library.add")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("documents.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)]"
          />
        </div>
        {!query.trim() && currentFolder && (
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={15} /> {t("library.backToAllFiles")} <span className="text-[var(--color-ink-faint)]">/</span> {currentFolder.name}
          </button>
        )}
      </div>

      {uploadError && <p className="text-xs text-red-500 font-medium mb-4">{uploadError}</p>}
      {uploading && <p className="text-xs text-[var(--text-secondary)] mb-4">{t("documents.uploadingToDrive")}</p>}

      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx"
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

      <div
        className="min-h-[240px] rounded-2xl"
        onContextMenu={(e) => menu.open(e, canvasMenuItems())}
      >
        {showFolders && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">{t("library.foldersLabel")}</h3>
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {folders.map((f) => {
                const count = documentItems.filter((d) => d.folderId === f.id).length;
                return (
                  <Card
                    key={f.id}
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => setCurrentFolderId(f.id)}
                    onContextMenu={(e) => menu.open(e, folderMenuItems(f))}
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
            </StaggerGrid>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={currentFolderId ? t("library.emptyFolderTitle") : documentItems.length === 0 ? t("documents.noDocumentsYetTitle") : t("documents.noDocumentsFoundTitle")}
            description={
              currentFolderId
                ? t("library.emptyFolderDescription")
                : documentItems.length === 0
                  ? t("library.rightClickHint")
                  : t("documents.noDocumentsFoundDescription")
            }
          />
        ) : (
          <StaggerGrid className="space-y-2.5">
            {filtered.map((d) => {
              const Icon = fileIcons[d.fileType];
              const color = fileColors[d.fileType];
              const uploader = getUser(d.uploadedBy);
              const folder = query.trim() ? folders.find((f) => f.id === d.folderId) : null;
              return (
                <Card key={d.id} className="p-4 flex items-center gap-4" onContextMenu={(e) => menu.open(e, fileMenuItems(d))}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{d.name}</p>
                    <p className="text-[11.5px] text-[var(--text-secondary)]">
                      {uploader?.name} · {formatDate(d.uploadedAt, undefined, language)} · {d.size}
                      {folder && <> · {folder.name}</>}
                    </p>
                  </div>
                  {d.driveFileId ? (
                    <a
                      href={driveDownloadUrl(d.driveFileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] shrink-0"
                      title={t("documents.downloadTitle")}
                    >
                      <Download size={16} />
                    </a>
                  ) : (
                    <button className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] shrink-0" title={t("documents.addedBeforeDrive")} disabled>
                      <Download size={16} />
                    </button>
                  )}
                </Card>
              );
            })}
          </StaggerGrid>
        )}
      </div>

      {menu.state && <ContextMenu x={menu.state.x} y={menu.state.y} items={menu.state.items} onClose={menu.close} />}

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
        title={t("library.deleteDocumentTitle")}
        message={t("library.deleteFileMessage")}
        confirming={deleting}
      />
    </div>
  );
}
