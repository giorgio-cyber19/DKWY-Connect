"use client";

import { useEffect, useState } from "react";
import { X, FileWarning, ExternalLink, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { driveDownloadUrl, openInGoogleEditor } from "@/lib/upload";
import { WordViewer } from "./WordViewer";
import { ExcelViewer } from "./ExcelViewer";
import type { DocumentItem } from "@/lib/types";

/**
 * Opens a Word or Excel file in the app: Word as real pages, Excel as a real spreadsheet. Both are view-only —
 * the clear blue "Edit in Google Drive" button opens the file in Google's editor.
 */
export function DocumentViewer({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [opening, setOpening] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
        const data = await res.arrayBuffer();
        if (cancelled) return;
        step = "read";
        // .xlsx and .docx are zip archives ("PK"). Anything else can't be shown.
        const magic = new Uint8Array(data.slice(0, 2));
        if (magic[0] !== 0x50 || magic[1] !== 0x4b) throw new Error("not_an_office_file");
        setBuffer(data);
      } catch (err) {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : "";
          if (step === "download") {
            if (failedStatus === 401) setLoadError(t("documents.errorSignedOut"));
            else if (failedStatus === 404 || failedCode === "file_not_found") setLoadError(t("documents.errorFileMissing"));
            else if (failedCode === "not_configured" || failedCode === "drive_auth") setLoadError(t("documents.errorDriveConnection"));
            else if (failedStatus === 0 && !text.includes("download_failed")) setLoadError(t("documents.errorOffline"));
            else setLoadError(t("documents.couldNotOpenFile"));
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

  /** Opens the file in Google Sheets / Docs. The tab is opened right away (before the await) so browsers don't block it. */
  async function editInDrive() {
    if (!doc.driveFileId) return;
    setOpening(true);
    setEditError(null);
    const tab = window.open("", "_blank");
    try {
      const url = await openInGoogleEditor(doc.driveFileId, doc.fileType === "xlsx" ? "sheet" : "doc");
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      tab?.close();
      setEditError(translateApiError(err, language));
    } finally {
      setOpening(false);
    }
  }

  const isSheet = doc.fileType === "xlsx";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-elevated)]">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border-soft)] shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{doc.name}</p>
          <p className="text-[11px] text-[var(--text-secondary)] truncate">{isSheet ? t("documents.viewOnlySheetNotice") : t("documents.viewOnlyWordNotice")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editError && <p className="text-xs text-red-500 font-medium hidden md:block max-w-[16rem]">{editError}</p>}
          {!loadError && doc.driveFileId && (
            <button
              type="button"
              onClick={editInDrive}
              disabled={opening}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-[13px] font-bold text-white shadow-md transition-colors bg-[#1a73e8] hover:bg-[#1765cc] disabled:opacity-60 focus-ring"
            >
              {opening ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              <span className="hidden sm:inline">{t("documents.editInGoogleDrive")}</span>
              <span className="sm:hidden">{t("documents.editShort")}</span>
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] focus-ring" aria-label={t("common.close")}>
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
      ) : buffer ? (
        isSheet ? <ExcelViewer buffer={buffer} /> : <WordViewer buffer={buffer} />
      ) : null}
    </div>
  );
}
