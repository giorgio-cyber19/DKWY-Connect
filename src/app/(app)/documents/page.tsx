"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Eye,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { hasDraggedFiles, readDroppedContent } from "@/lib/dropped-files";
import { splitFileName } from "@/lib/file-name";
import { applyLibraryView, hasActiveFilters, parseSizeToBytes, DEFAULT_VIEW_STATE, type LibraryEntry, type LibraryViewState } from "@/lib/library-view";
import { LibraryToolbar, type LibraryLayout } from "@/components/library/LibraryToolbar";
import { LibraryList, LibraryGrid, FolderTiles, type LibraryRow } from "@/components/library/LibraryFiles";
import { uploadToDrive, driveDownloadUrl, openInGoogleEditor } from "@/lib/upload";
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

function documentEntry(d: DocumentItem): LibraryEntry {
  return { name: d.name, kind: d.fileType, sizeBytes: parseSizeToBytes(d.size), modified: d.modifiedAt ?? d.uploadedAt, ownerId: d.uploadedBy };
}

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
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // What the cursor is over while dragging files in: the page ("canvas") or a folder's id.
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [viewState, setViewState] = useState<LibraryViewState>(DEFAULT_VIEW_STATE);
  const [layout, setLayout] = useState<LibraryLayout>("list");
  const [renameTarget, setRenameTarget] = useState<DocumentItem | null>(null);
  const [renameBase, setRenameBase] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
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

  async function handleFiles(fileList: FileList | File[] | null, targetFolder: LibraryFolder | null) {
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

  function openRenameFile(item: DocumentItem) {
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
      await useAppStore.getState().renameDocumentItem(renameTarget.id, renameBase.trim() + splitFileName(renameTarget.name).ext);
      setRenameTarget(null);
    } catch (err) {
      setRenameError(translateApiError(err, language));
    } finally {
      setRenaming(false);
    }
  }

  function isSupportedFile(file: File): boolean {
    return (file.name.split(".").pop() ?? "").toLowerCase() in extToFileType;
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
        const folder = existing ?? (await useAppStore.getState().createLibraryFolder(dropped.name, "documents"));
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

  async function handleOpenInGoogle(fileId: string) {
    setOpenError(null);
    // Opened synchronously (before the await) so browsers don't treat it as an
    // unrequested popup — its destination is filled in once the share link is ready.
    const newTab = window.open("", "_blank");
    try {
      const url = await openInGoogleEditor(fileId);
      if (newTab) newTab.location.href = url;
    } catch (err) {
      newTab?.close();
      setOpenError(translateApiError(err, language));
    }
  }

  function fileMenuItems(item: DocumentItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    const canPreview = item.fileType === "docx" || item.fileType === "xlsx";
    if (canPreview && item.driveFileId) {
      items.push({ label: t("library.open"), icon: <Eye size={15} />, onClick: () => setViewingDoc(item) });
    }
    if (item.fileType === "xlsx" && item.driveFileId) {
      items.push({ label: t("documents.openInGoogleSheets"), icon: <ExternalLink size={15} />, onClick: () => handleOpenInGoogle(item.driveFileId!) });
    }
    if (item.fileType === "docx" && item.driveFileId) {
      items.push({ label: t("documents.openInGoogleDocs"), icon: <ExternalLink size={15} />, onClick: () => handleOpenInGoogle(item.driveFileId!) });
    }
    if (item.driveFileId) {
      items.push({
        label: t("library.download"),
        icon: <Download size={15} />,
        onClick: () => window.open(driveDownloadUrl(item.driveFileId!), "_blank"),
      });
    }
    items.push({ label: t("library.rename"), icon: <Pencil size={15} />, onClick: () => openRenameFile(item) });
    items.push({ label: t("library.delete"), icon: <Trash2 size={15} />, onClick: () => setDeleteFile(item), destructive: true });
    return items;
  }

  function patchView(patch: Partial<LibraryViewState>) {
    setViewState((v) => ({ ...v, ...patch }));
  }

  // Click a column header to sort by it; clicking the active one flips the direction (like Drive).
  function sortBy(key: LibraryViewState["sortKey"]) {
    setViewState((v) => (v.sortKey === key ? { ...v, sortDir: v.sortDir === "asc" ? "desc" : "asc" } : { ...v, sortKey: key, sortDir: key === "name" ? "asc" : "desc" }));
  }

  const visibleItems = useMemo(() => applyLibraryView(filtered, documentEntry, viewState), [filtered, viewState]);

  const people = useMemo(() => {
    const ids = Array.from(new Set(documentItems.map((x) => x.uploadedBy)));
    return ids.map((id) => ({ id, name: getUser(id)?.name ?? "—" })).sort((a, b) => a.name.localeCompare(b.name));
  }, [documentItems]);

  const typeOptions = [
    { value: "pdf", label: t("library.kindPdf") },
    { value: "docx", label: t("library.kindWord") },
    { value: "xlsx", label: t("library.kindExcel") },
  ];

  const rows: LibraryRow[] = visibleItems.map((item) => {
    const uploader = getUser(item.uploadedBy);
    return {
      id: item.id,
      name: item.name,
      Icon: fileIcons[item.fileType],
      color: fileColors[item.fileType],
      sizeText: item.size,
      modified: item.modifiedAt ?? item.uploadedAt,
      ownerName: uploader?.name ?? "",
      ownerColor: uploader?.avatarColor,
      location: query.trim() ? folders.find((f) => f.id === item.folderId)?.name : undefined,
      canOpen: (item.fileType === "docx" || item.fileType === "xlsx") && !!item.driveFileId,
    };
  });

  function openRow(id: string) {
    const item = documentItems.find((x) => x.id === id);
    if (item) setViewingDoc(item);
  }

  function rowMenu(e: React.MouseEvent, id: string) {
    const item = documentItems.find((x) => x.id === id);
    if (item) menu.open(e, fileMenuItems(item));
  }

  function folderMenu(e: React.MouseEvent, id: string) {
    const folder = folders.find((f) => f.id === id);
    if (folder) menu.open(e, folderMenuItems(folder));
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

      <LibraryToolbar state={viewState} onChange={patchView} typeOptions={typeOptions} people={people} layout={layout} onLayoutChange={setLayout} />

      {uploadError && <p className="text-xs text-red-500 font-medium mb-4">{uploadError}</p>}
      {openError && <p className="text-xs text-red-500 font-medium mb-4">{openError}</p>}
      {uploading && <p className="text-xs text-[var(--text-secondary)] mb-4">{t("documents.uploadingToDrive")}</p>}
      {dropNotice && <p className="text-xs text-[var(--text-secondary)] mb-4">{dropNotice}</p>}

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
          <div className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2.5">{t("library.foldersLabel")}</h3>
            <FolderTiles
              folders={folders}
              dragTarget={dragTarget}
              onOpen={setCurrentFolderId}
              onMenu={folderMenu}
              onDragOver={(e, id) => {
                if (!hasDraggedFiles(e.dataTransfer)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                setDragTarget(id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragTarget(null);
              }}
              onDrop={(e, id) => {
                const folder = folders.find((f) => f.id === id);
                if (folder) handleDrop(e, folder);
              }}
            />
          </div>
        )}

        {rows.length === 0 ? (
          filtered.length > 0 && hasActiveFilters(viewState) ? (
            <EmptyState
              icon={Folder}
              title={t("library.noMatchTitle")}
              description={t("library.noMatchDescription")}
              action={
                <Button size="sm" variant="outline" onClick={() => patchView({ type: "all", modified: "any", from: "", to: "", size: "any", person: "all" })}>
                  {t("library.clearFilters")}
                </Button>
              }
            />
          ) : (
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
          )
        ) : (
          <>
            {showFolders && folders.length > 0 && <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2.5">{t("library.filesLabel")}</h3>}
            {layout === "list" ? (
              <LibraryList rows={rows} sortKey={viewState.sortKey} sortDir={viewState.sortDir} onSort={sortBy} onOpen={openRow} onMenu={rowMenu} />
            ) : (
              <LibraryGrid rows={rows} onOpen={openRow} onMenu={rowMenu}  />
            )}
          </>
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
        title={t("library.deleteDocumentTitle")}
        message={t("library.deleteFileMessage")}
        confirming={deleting}
      />

      {viewingDoc && <DocumentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  );
}
