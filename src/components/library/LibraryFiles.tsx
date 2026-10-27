"use client";

import { ArrowDown, ArrowUp, Check, Folder, MoreVertical, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/lib/language-context";
import { modifiedDay, type LibrarySortKey } from "@/lib/library-view";
import { formatDate, cn } from "@/lib/utils";

/** Compact, Google-Drive-style presentation of library files and folders (shared by Documents and Media). */

export interface LibraryRow {
  id: string;
  name: string;
  Icon: LucideIcon;
  color: string;
  sizeText: string;
  /** ISO date or datetime of the last change. */
  modified: string;
  ownerName: string;
  ownerColor?: string;
  /** Shown under the name while searching across folders. */
  location?: string;
  /** Whether clicking the row does something (preview / viewer). */
  canOpen: boolean;
}

type MenuHandler = (e: React.MouseEvent, id: string) => void;

function MoreButton({ onClick, label, className }: { onClick: (e: React.MouseEvent) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/[0.08] shrink-0 focus-ring", className)}
    >
      <MoreVertical size={16} />
    </button>
  );
}

function SortHeader({ label, active, dir, onClick, className }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 text-left hover:text-[var(--text-primary)] focus-ring rounded", active && "text-[var(--text-primary)]", className)}>
      {label}
      {active && (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  );
}

export function LibraryList({
  rows,
  sortKey,
  sortDir,
  onSort,
  onOpen,
  onMenu,
}: {
  rows: LibraryRow[];
  sortKey: LibrarySortKey;
  sortDir: "asc" | "desc";
  onSort: (key: LibrarySortKey) => void;
  onOpen: (id: string) => void;
  onMenu: MenuHandler;
}) {
  const { t, language } = useLanguage();

  return (
    <div className="rounded-xl border border-[var(--border-soft)] overflow-hidden" role="table">
      <div role="row" className="flex items-center gap-3 px-3 h-10 text-[12px] font-semibold text-[var(--text-secondary)] border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--color-ink)_3%,transparent)]">
        <div role="columnheader" className="flex-1 min-w-0">
          <SortHeader label={t("library.colName")} active={sortKey === "name"} dir={sortDir} onClick={() => onSort("name")} />
        </div>
        <div role="columnheader" className="hidden md:block w-40 shrink-0">
          {t("library.colOwner")}
        </div>
        <div role="columnheader" className="hidden sm:block w-28 shrink-0">
          <SortHeader label={t("library.colModified")} active={sortKey === "modified"} dir={sortDir} onClick={() => onSort("modified")} />
        </div>
        <div role="columnheader" className="w-16 shrink-0 flex justify-end">
          <SortHeader label={t("library.colSize")} active={sortKey === "size"} dir={sortDir} onClick={() => onSort("size")} className="hidden sm:inline-flex" />
        </div>
        <div className="w-8 shrink-0" />
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          role="row"
          onClick={row.canOpen ? () => onOpen(row.id) : undefined}
          onContextMenu={(e) => onMenu(e, row.id)}
          className={cn(
            "group flex items-center gap-3 px-3 h-11 border-b border-[var(--border-softer)] last:border-b-0 text-[13px] hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)] transition-colors",
            row.canOpen && "cursor-pointer"
          )}
        >
          <div role="cell" className="flex-1 min-w-0 flex items-center gap-3">
            <row.Icon size={18} style={{ color: row.color }} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate leading-tight">{row.name}</p>
              {/* Phones hide the Modified column, so the date moves under the name (as in Drive's mobile list). */}
              {(row.location || row.modified) && (
                <p className={cn("text-[10.5px] text-[var(--text-secondary)] truncate leading-tight", !row.location && "sm:hidden")}>
                  {row.location ?? formatDate(modifiedDay(row.modified), undefined, language)}
                </p>
              )}
            </div>
          </div>
          <div role="cell" className="hidden md:flex w-40 shrink-0 items-center gap-2 min-w-0 text-[var(--text-secondary)]">
            <Avatar name={row.ownerName || "?"} color={row.ownerColor} size="xs" />
            <span className="truncate">{row.ownerName}</span>
          </div>
          <div role="cell" className="hidden sm:block w-28 shrink-0 text-[var(--text-secondary)]">
            {row.modified ? formatDate(modifiedDay(row.modified), undefined, language) : "—"}
          </div>
          <div role="cell" className="w-16 shrink-0 text-right text-[var(--text-secondary)]">
            {row.sizeText}
          </div>
          <MoreButton label={t("library.moreActions")} onClick={(e) => onMenu(e, row.id)} />
        </div>
      ))}
    </div>
  );
}

export function LibraryGrid({
  rows,
  onOpen,
  onMenu,
  selectedIds,
  onToggleSelect,
}: {
  rows: LibraryRow[];
  onOpen: (id: string) => void;
  onMenu: MenuHandler;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {rows.map((row) => {
        const selected = selectedIds?.includes(row.id) ?? false;
        return (
          <div
            key={row.id}
            onClick={row.canOpen ? () => onOpen(row.id) : undefined}
            onContextMenu={(e) => onMenu(e, row.id)}
            className={cn(
              "group relative rounded-xl border overflow-hidden bg-[var(--bg-elevated)] transition-shadow hover:shadow-md",
              row.canOpen && "cursor-pointer",
              selected ? "border-[var(--color-blue)] ring-2 ring-[var(--color-blue)]" : "border-[var(--border-soft)]"
            )}
          >
            {onToggleSelect && (
              <button
                type="button"
                aria-label="Select"
                aria-pressed={selected}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(row.id);
                }}
                className={cn(
                  "absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-opacity",
                  selected ? "bg-[var(--color-blue)] border-[var(--color-blue)] opacity-100" : "bg-white/80 border-[var(--border-soft)] opacity-0 group-hover:opacity-100 focus:opacity-100"
                )}
              >
                {selected && <Check size={12} className="text-white" />}
              </button>
            )}
            <div className="h-24 flex items-center justify-center" style={{ background: `color-mix(in srgb, ${row.color} 12%, var(--bg-elevated))` }}>
              <row.Icon size={36} style={{ color: row.color }} strokeWidth={1.6} />
            </div>
            <div className="flex items-center gap-2 pl-3 pr-1 h-10 border-t border-[var(--border-softer)]">
              <row.Icon size={15} style={{ color: row.color }} className="shrink-0" />
              <span className="text-[12.5px] font-medium truncate flex-1" title={row.name}>
                {row.name}
              </span>
              <MoreButton label={t("library.moreActions")} onClick={(e) => onMenu(e, row.id)} className="w-7 h-7 opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface FolderTileData {
  id: string;
  name: string;
}

export function FolderTiles({
  folders,
  dragTarget,
  onOpen,
  onMenu,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folders: FolderTileData[];
  dragTarget: string | null;
  onOpen: (id: string) => void;
  onMenu: MenuHandler;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {folders.map((f) => (
        <div
          key={f.id}
          onClick={() => onOpen(f.id)}
          onContextMenu={(e) => onMenu(e, f.id)}
          onDragOver={(e) => onDragOver(e, f.id)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, f.id)}
          className={cn(
            "flex items-center gap-3 h-12 pl-3.5 pr-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,var(--bg-elevated))]",
            dragTarget === f.id && "ring-2 ring-[var(--color-blue)] bg-[color-mix(in_srgb,var(--color-blue)_8%,transparent)]"
          )}
        >
          <Folder size={19} fill="currentColor" className="text-[var(--text-secondary)] shrink-0" />
          <span className="text-[13px] font-medium truncate flex-1" title={f.name}>
            {f.name}
          </span>
          <MoreButton label={t("library.moreActions")} onClick={(e) => onMenu(e, f.id)} />
        </div>
      ))}
    </div>
  );
}
