"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Folder, CircleCheck, CircleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { canMoveFolderInto, descendantIds } from "@/lib/library-folders";
import { cn } from "@/lib/utils";
import type { LibraryFolder } from "@/lib/types";

/**
 * Moving and copying files and folders in Documents and Media: drag-and-drop onto a folder, and the
 * "Move to… / Copy to…" dialog behind the right-click menu. Both pages share it.
 */

type Library = LibraryFolder["library"];
type Kind = "file" | "folder";
type Mode = "move" | "copy";

interface Subject {
  kind: Kind;
  id: string;
  name: string;
  /** The folder it sits in now (null = top level). */
  parentId: string | null;
}

interface FileLike {
  id: string;
  name: string;
  folderId: string | null;
}

function flatten(folders: LibraryFolder[], parentId: string | null = null, depth = 0, seen = new Set<string>()): { folder: LibraryFolder; depth: number }[] {
  const out: { folder: LibraryFolder; depth: number }[] = [];
  const children = folders.filter((f) => (f.parentId ?? null) === parentId && !seen.has(f.id)).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  for (const folder of children) {
    seen.add(folder.id);
    out.push({ folder, depth }, ...flatten(folders, folder.id, depth + 1, seen));
  }
  return out;
}

function DestinationDialog({
  mode,
  subject,
  folders,
  onClose,
  onConfirm,
}: {
  mode: Mode;
  subject: Subject;
  folders: LibraryFolder[];
  onClose: () => void;
  onConfirm: (targetId: string | null) => Promise<void>;
}) {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => flatten(folders), [folders]);
  const blocked = useMemo(() => (subject.kind === "folder" ? new Set([subject.id, ...descendantIds(folders, subject.id)]) : new Set<string>()), [folders, subject]);

  function disabledReason(targetId: string | null): string | null {
    if (targetId !== null && blocked.has(targetId)) return "";
    if (mode === "move" && targetId === subject.parentId) return t("library.currentLocation");
    return null;
  }

  async function confirm() {
    if (selected === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(selected);
    } catch (err) {
      setError(translateApiError(err, language));
      setBusy(false);
    }
  }

  const rows: { id: string | null; label: string; depth: number }[] = [{ id: null, label: t("library.topLevel"), depth: 0 }, ...tree.map(({ folder, depth }) => ({ id: folder.id, label: folder.name, depth: depth + 1 }))];

  return (
    <Modal open onClose={busy ? () => undefined : onClose} title={`${mode === "move" ? t("library.moveTitle") : t("library.copyTitle")} “${subject.name}”`} size="sm">
      <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">{t("library.chooseDestination")}</p>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border-soft)] p-1.5 mb-4" role="listbox" aria-label={t("library.chooseDestination")}>
        {rows.map((row) => {
          const reason = disabledReason(row.id);
          const disabled = reason !== null;
          const isSelected = selected === row.id;
          return (
            <button
              key={row.id ?? "root"}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled || busy}
              onClick={() => setSelected(row.id)}
              style={{ paddingLeft: 10 + row.depth * 18 }}
              className={cn(
                "w-full flex items-center gap-2.5 pr-3 py-2 rounded-lg text-left text-[13px] font-medium transition-colors focus-ring",
                isSelected ? "bg-[color-mix(in_srgb,var(--color-blue)_14%,transparent)] text-[var(--text-primary)]" : "hover:bg-black/[0.05]",
                disabled && "opacity-45 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <Folder size={16} fill={row.id === null ? "none" : "currentColor"} className="shrink-0 text-[var(--text-secondary)]" />
              <span className="truncate flex-1">{row.label}</span>
              {reason && <span className="text-[11px] font-normal text-[var(--text-secondary)] shrink-0">({reason})</span>}
            </button>
          );
        })}
      </div>
      {folders.length === 0 && <p className="text-[11.5px] text-[var(--text-secondary)] mb-3">{t("library.noSubfolders")}</p>}
      {error && <p className="text-[12px] text-red-500 font-medium mb-3">{error}</p>}
      <Button className="w-full" onClick={confirm} loading={busy} disabled={selected === undefined || busy}>
        {mode === "move" ? t("library.moveHere") : t("library.copyHere")}
      </Button>
    </Modal>
  );
}

export function useLibraryTransfer({ library, folders, getFile }: { library: Library; folders: LibraryFolder[]; getFile: (id: string) => FileLike | undefined }) {
  const { t, language } = useLanguage();
  const [dragging, setDragging] = useState<{ kind: Kind; id: string } | null>(null);
  const dragRef = useRef<{ kind: Kind; id: string } | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: Mode; subject: Subject } | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  const subjectOf = useCallback(
    (kind: Kind, id: string): Subject | null => {
      if (kind === "folder") {
        const f = folders.find((x) => x.id === id);
        return f ? { kind, id, name: f.name, parentId: f.parentId ?? null } : null;
      }
      const file = getFile(id);
      return file ? { kind, id, name: file.name, parentId: file.folderId ?? null } : null;
    },
    [folders, getFile]
  );

  const perform = useCallback(
    async (mode: Mode, subject: Subject, targetId: string | null) => {
      const store = useAppStore.getState();
      if (mode === "move") {
        if (subject.kind === "folder") await store.moveLibraryFolder(subject.id, targetId);
        else await store.moveLibraryItem(library, subject.id, targetId);
      } else if (subject.kind === "folder") await store.copyLibraryFolder(subject.id, targetId);
      else await store.copyLibraryItem(library, subject.id, targetId);

      const targetName = targetId ? (folders.find((f) => f.id === targetId)?.name ?? "") : t("library.topLevel");
      setNotice({ ok: true, text: `${mode === "move" ? t("library.movedNotice") : t("library.copiedNotice")}: “${subject.name}” ${t("library.noticeInto")} “${targetName}”` });
    },
    [library, folders, t]
  );

  /** A drop is only a valid move when it actually changes something and is allowed. */
  function canDropOn(targetId: string | null): boolean {
    const drag = dragRef.current;
    if (!drag) return false;
    const subject = subjectOf(drag.kind, drag.id);
    if (!subject) return false;
    if (subject.parentId === targetId) return false;
    if (subject.kind === "folder") return canMoveFolderInto(folders, subject.id, targetId);
    return true;
  }

  function startDrag(kind: Kind, id: string) {
    return (e: React.DragEvent) => {
      const subject = subjectOf(kind, id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", subject?.name ?? "");
      dragRef.current = { kind, id };
      setDragging({ kind, id });
    };
  }

  function endDrag() {
    dragRef.current = null;
    setDragging(null);
    setOverKey(null);
  }

  /** Each returns true when an in-app drag is active (so the caller should skip its own file-upload handling). */
  function handleOver(e: React.DragEvent, targetId: string | null): boolean {
    if (!dragRef.current) return false;
    e.stopPropagation();
    if (canDropOn(targetId)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverKey(targetId ?? "root");
    } else {
      e.dataTransfer.dropEffect = "none";
      setOverKey(null);
    }
    return true;
  }

  function handleLeave(e: React.DragEvent): boolean {
    if (!dragRef.current) return false;
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverKey(null);
    return true;
  }

  function handleDrop(e: React.DragEvent, targetId: string | null): boolean {
    const drag = dragRef.current;
    if (!drag) return false;
    e.preventDefault();
    e.stopPropagation();
    const subject = subjectOf(drag.kind, drag.id);
    const allowed = canDropOn(targetId);
    endDrag();
    if (subject && allowed) {
      perform("move", subject, targetId).catch((err) => setNotice({ ok: false, text: translateApiError(err, language) }));
    }
    return true;
  }

  function openDialog(mode: Mode, kind: Kind, id: string) {
    const subject = subjectOf(kind, id);
    if (subject) setDialog({ mode, subject });
  }

  const element = (
    <>
      {dialog && (
        <DestinationDialog
          mode={dialog.mode}
          subject={dialog.subject}
          folders={folders}
          onClose={() => setDialog(null)}
          onConfirm={async (targetId) => {
            await perform(dialog.mode, dialog.subject, targetId);
            setDialog(null);
          }}
        />
      )}
    </>
  );

  const noticeElement = notice && (
    <p className={cn("flex items-center gap-1.5 text-xs font-medium mb-4", notice.ok ? "text-[var(--color-sage-deep)]" : "text-red-500")} role="status">
      {notice.ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />} {notice.text}
    </p>
  );

  return { dragging, overKey, startDrag, endDrag, handleOver, handleLeave, handleDrop, openDialog, element, noticeElement };
}
