"use client";

import { useEffect, useState } from "react";
import { X, Plus, Save, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { driveDownloadUrl, updateFileInDrive } from "@/lib/upload";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A1-style column letters: 0 -> A, 25 -> Z, 26 -> AA, ... */
function columnLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

/** Numeric-looking strings round-trip as numbers; everything else stays text. */
function coerceCell(value: string): string | number {
  if (value.trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) && String(n) === value.trim() ? n : value;
}

export function DocumentViewer({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [sheetsData, setSheetsData] = useState<Record<string, string[][]>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!doc.driveFileId) {
        setLoadError(t("documents.addedBeforeDrive"));
        setLoading(false);
        return;
      }
      // Which step failed decides what we tell the user.
      let step: "download" | "read" = "download";
      let failedStatus = 0;
      let failedCode = "";
      try {
        const res = await fetch(driveDownloadUrl(doc.driveFileId));
        if (!res.ok) {
          failedStatus = res.status;
          failedCode = String((await res.json().catch(() => ({}))).error ?? "");
          throw new Error("download_failed");
        }
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        step = "read";
        // .xlsx and .docx are zip archives ("PK"). Anything else would be parsed as plain text and silently show up blank.
        const magic = new Uint8Array(buffer.slice(0, 2));
        if (magic[0] !== 0x50 || magic[1] !== 0x4b) throw new Error("not_an_office_file");

        if (doc.fileType === "xlsx") {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buffer, { type: "array" });
          const data: Record<string, string[][]> = {};
          for (const name of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "" });
            const maxCols = Math.max(1, ...rows.map((r) => r.length));
            data[name] = rows.length > 0 ? rows.map((r) => Array.from({ length: maxCols }, (_, i) => String(r[i] ?? ""))) : [Array(maxCols).fill("")];
          }
          setSheetNames(wb.SheetNames);
          setActiveSheet(wb.SheetNames[0] ?? "");
          setSheetsData(data);
        } else if (doc.fileType === "docx") {
          const mammothModule = await import("mammoth");
          const mammoth = mammothModule.default ?? mammothModule;
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (!cancelled) setHtml(result.value);
        }
      } catch (err) {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : "";
          if (step === "download") {
            if (failedStatus === 401) setLoadError(t("documents.errorSignedOut"));
            else if (failedStatus === 404 || failedCode === "file_not_found") setLoadError(t("documents.errorFileMissing"));
            else if (failedCode === "not_configured" || failedCode === "drive_auth") setLoadError(t("documents.errorDriveConnection"));
            else if (failedStatus === 0 && !text.includes("download_failed")) setLoadError(t("documents.errorOffline"));
            else setLoadError(t("documents.couldNotOpenFile"));
          } else if (/dynamically imported module|Loading chunk|ChunkLoadError/i.test(text)) {
            // The app was updated while this page was open, so its lazy-loaded parts are gone.
            setLoadError(t("documents.errorRefreshNeeded"));
          } else {
            setLoadError(t("documents.errorUnreadable"));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function updateCell(row: number, col: number, value: string) {
    setSheetsData((prev) => {
      const sheet = prev[activeSheet].map((r) => [...r]);
      sheet[row][col] = value;
      return { ...prev, [activeSheet]: sheet };
    });
    setDirty(true);
  }

  function addRow() {
    setSheetsData((prev) => {
      const sheet = prev[activeSheet];
      const cols = sheet[0]?.length ?? 1;
      return { ...prev, [activeSheet]: [...sheet, Array(cols).fill("")] };
    });
    setDirty(true);
  }

  function addColumn() {
    setSheetsData((prev) => ({ ...prev, [activeSheet]: prev[activeSheet].map((r) => [...r, ""]) }));
    setDirty(true);
  }

  function handleClose() {
    if (dirty && !window.confirm(t("documents.unsavedChangesConfirm"))) return;
    onClose();
  }

  async function handleSave() {
    if (!doc.driveFileId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const name of sheetNames) {
        const aoa = sheetsData[name].map((row) => row.map(coerceCell));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      }
      const out: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([out], { type: XLSX_MIME });
      const result = await updateFileInDrive(doc.driveFileId, blob, XLSX_MIME);
      await useAppStore.getState().updateDocumentItemSize(doc.id, result.size);
      setDirty(false);
    } catch (err) {
      setSaveError(translateApiError(err, language));
    } finally {
      setSaving(false);
    }
  }

  const rows = sheetsData[activeSheet] ?? [];
  const colCount = rows[0]?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-elevated)]">
      <header className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[var(--border-soft)] shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{doc.name}</p>
          {doc.fileType === "docx" && <p className="text-[11px] text-[var(--text-secondary)]">{t("documents.viewOnlyWordNotice")}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {doc.fileType === "xlsx" && !loadError && (
            <>
              {saveError && <p className="text-xs text-red-500 font-medium">{saveError}</p>}
              <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
                {saving ? t("documents.savingToDrive") : dirty ? "" : t("documents.allChangesSaved")}
              </span>
              <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
                <Save size={14} /> {t("documents.saveChanges")}
              </Button>
            </>
          )}
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)]" aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">{t("documents.openingDocument")}</div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <FileWarning size={28} className="text-[var(--text-secondary)]" />
          <p className="text-sm font-semibold">{loadError}</p>
        </div>
      ) : doc.fileType === "docx" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10 prose-doc" dangerouslySetInnerHTML={{ __html: html ?? "" }} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[var(--border-soft)] overflow-x-auto no-scrollbar shrink-0">
              {sheetNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveSheet(name)}
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors shrink-0",
                    name === activeSheet
                      ? "border-[var(--color-gold)] text-[var(--color-gold-deep)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <table className="border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 bg-[var(--bg-sidebar)] border border-[var(--border-soft)]" />
                  {Array.from({ length: colCount }, (_, c) => (
                    <th key={c} className="min-w-[110px] px-2 py-1.5 bg-[var(--bg-sidebar)] border border-[var(--border-soft)] text-[11px] font-semibold text-[var(--text-secondary)]">
                      {columnLabel(c)}
                    </th>
                  ))}
                  <th className="w-10 bg-[var(--bg-sidebar)] border border-[var(--border-soft)]">
                    <button onClick={addColumn} className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--color-gold-deep)]" title={t("documents.addColumn")}>
                      <Plus size={13} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    <td className="w-10 bg-[var(--bg-sidebar)] border border-[var(--border-soft)] text-center text-[11px] font-semibold text-[var(--text-secondary)]">{r + 1}</td>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-[var(--border-soft)] p-0">
                        <input
                          value={cell}
                          onChange={(e) => updateCell(r, c, e.target.value)}
                          className="w-full min-w-[110px] px-2 py-1.5 text-sm bg-transparent focus:bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="w-10 bg-[var(--bg-sidebar)] border border-[var(--border-soft)]">
                    <button onClick={addRow} className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--color-gold-deep)]" title={t("documents.addRow")}>
                      <Plus size={13} />
                    </button>
                  </td>
                  <td colSpan={colCount} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
