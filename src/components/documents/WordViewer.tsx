"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, MoveHorizontal, FileWarning } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * Word documents shown the way Word and Google Docs show them: real pages on a grey desk, with the
 * document's own fonts, colours, highlights, spacing, lists, tables, images, headers and footers (docx-preview).
 * If a file can't be rendered like that, a plainer reading view (mammoth) is shown instead.
 */

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;

export function WordViewer({ buffer }: { buffer: ArrayBuffer }) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const pageWidthRef = useRef(0);
  const [fallbackHtml, setFallbackHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const host = pagesRef.current;
      if (!host) return;
      try {
        const { renderAsync } = await import("docx-preview");
        host.innerHTML = "";
        await renderAsync(buffer, host, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
          experimental: true,
        });
        if (cancelled) return;

        // Links open in a new tab, and only web / mail / in-page links are kept (never javascript: and the like).
        host.querySelectorAll("a[href]").forEach((a) => {
          const href = a.getAttribute("href") ?? "";
          if (!/^(https?:|mailto:|#)/i.test(href)) a.removeAttribute("href");
          else if (!href.startsWith("#")) {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          }
        });

        // Open at full size, or shrunk to fit on a narrow screen.
        const page = host.querySelector<HTMLElement>("section.docx");
        const scroller = scrollRef.current;
        if (page && scroller) {
          pageWidthRef.current = page.offsetWidth;
          if (page.offsetWidth > 0 && scroller.clientWidth > 0) setZoom(Math.min(1, (scroller.clientWidth - 24) / page.offsetWidth));
        }
      } catch (err) {
        console.error("Word viewer: falling back to the reading view:", err);
        try {
          const mammothModule = await import("mammoth");
          const mammoth = mammothModule.default ?? mammothModule;
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (!cancelled) setFallbackHtml(result.value);
        } catch {
          if (!cancelled) setFailed(true);
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [buffer]);

  function fitWidth() {
    const scroller = scrollRef.current;
    if (scroller && pageWidthRef.current > 0) setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (scroller.clientWidth - 24) / pageWidthRef.current)));
  }

  const button = "p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] disabled:opacity-40 focus-ring";

  if (failed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <FileWarning size={28} className="text-[var(--text-secondary)]" />
        <p className="text-sm font-semibold">{t("documents.errorUnreadable")}</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={scrollRef} className="word-viewer flex-1 min-h-0 overflow-auto bg-[color-mix(in_srgb,var(--color-ink)_9%,var(--bg-elevated))]">
        {fallbackHtml !== null ? (
          <div className="mx-auto my-4 max-w-[794px] bg-white text-black shadow-md px-6 sm:px-14 py-10 prose-doc" dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
        ) : (
          <div ref={pagesRef} style={{ zoom }} />
        )}
      </div>

      {fallbackHtml === null && (
        <div className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] shadow-lg px-1 py-0.5">
          <button className={button} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN} aria-label={t("library.pdfZoomOut")} title={t("library.pdfZoomOut")}>
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button className={button} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX} aria-label={t("library.pdfZoomIn")} title={t("library.pdfZoomIn")}>
            <ZoomIn size={16} />
          </button>
          <button className={button} onClick={fitWidth} aria-label={t("library.pdfFitWidth")} title={t("library.pdfFitWidth")}>
            <MoveHorizontal size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
