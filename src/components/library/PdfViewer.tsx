"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Download, ChevronUp, ChevronDown, FileWarning, MoveHorizontal } from "lucide-react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { useLanguage } from "@/lib/language-context";
import { driveDownloadUrl } from "@/lib/upload";
import { cn } from "@/lib/utils";

/**
 * Built-in PDF viewer (pdf.js): continuous scrolling, zoom, page jump and download — the same on every
 * device, with nothing to install and nothing sent to a third party. Pages are only drawn while they are
 * on (or near) the screen, so long documents stay light.
 */

const WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const PAGE_GAP = 12;
const SIDE_PADDING = 24;

interface PageSize {
  width: number;
  height: number;
}

function PdfPage({
  pdf,
  pageNumber,
  cssWidth,
  cssHeight,
  scrollRoot,
  registerRef,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  cssWidth: number;
  cssHeight: number;
  scrollRoot: HTMLDivElement | null;
  registerRef: (pageNumber: number, el: HTMLDivElement | null) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);

  // Draw only while the page is within about two screens of the viewport.
  useEffect(() => {
    const el = holderRef.current;
    if (!el || !scrollRoot) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: scrollRoot, rootMargin: "1600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!near) {
      // Give the memory back for pages that are far away.
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    let cancelled = false;
    let task: RenderTask | null = null;
    let page: PDFPageProxy | null = null;

    (async () => {
      try {
        page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) return;
        task = page.render({ canvasContext: context, viewport });
        await task.promise;
      } catch {
        /* a cancelled render (zoomed or scrolled away) is expected */
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
      page?.cleanup();
    };
  }, [pdf, pageNumber, near, cssWidth]);

  return (
    <div
      ref={(el) => {
        holderRef.current = el;
        registerRef(pageNumber, el);
      }}
      data-page={pageNumber}
      className="bg-white shadow-md mx-auto shrink-0"
      style={{ width: cssWidth, height: cssHeight }}
    >
      <canvas ref={canvasRef} className="block" style={{ width: cssWidth, height: cssHeight }} aria-label={`${pageNumber}`} />
    </div>
  );
}

export function PdfViewer({ name, fileId, onClose }: { name: string; fileId?: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = the page fills the window's width
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const pageEls = useRef<Record<number, HTMLDivElement | null>>({});

  // Load the file and open it with pdf.js.
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    let url: string | null = null;

    async function load() {
      if (!fileId) {
        setError(t("documents.addedBeforeDrive"));
        return;
      }
      try {
        const res = await fetch(driveDownloadUrl(fileId));
        if (!res.ok) throw new Error(`download ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
        setBlobUrl(url);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        loaded = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        if (cancelled) {
          loaded.destroy();
          return;
        }

        // Every page's own shape, so the scrollbar is right before anything is drawn.
        const count = loaded.numPages;
        const pageSizes: PageSize[] = [];
        for (let i = 1; i <= count; i++) {
          const page = await loaded.getPage(i);
          const v = page.getViewport({ scale: 1 });
          pageSizes.push({ width: v.width, height: v.height });
          page.cleanup();
          if (cancelled) return;
        }
        setSizes(pageSizes);
        setPdf(loaded);
      } catch (err) {
        console.error("PDF viewer failed:", err);
        if (!cancelled) setError(url ? t("library.pdfCantOpen") : t("library.pdfLoadFailed"));
      }
    }
    load();

    return () => {
      cancelled = true;
      loaded?.destroy();
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Escape closes; the window's own width decides what "fit to width" means.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!scrollRoot) return;
    const observer = new ResizeObserver(() => setContainerWidth(scrollRoot.clientWidth));
    observer.observe(scrollRoot);
    return () => observer.disconnect();
  }, [scrollRoot]);

  const registerRef = useCallback((pageNumber: number, el: HTMLDivElement | null) => {
    pageEls.current[pageNumber] = el;
  }, []);

  const baseWidth = Math.max(240, Math.min(containerWidth - SIDE_PADDING * 2, 1100));
  const layout = useMemo(
    () =>
      sizes.map((s) => {
        const width = baseWidth * zoom;
        return { width, height: (s.height / s.width) * width };
      }),
    [sizes, baseWidth, zoom]
  );

  function updateCurrentPage() {
    if (!scrollRoot) return;
    const probe = scrollRoot.scrollTop + scrollRoot.clientHeight * 0.35;
    let found = 1;
    for (let i = 1; i <= sizes.length; i++) {
      const el = pageEls.current[i];
      if (el && el.offsetTop <= probe) found = i;
      else break;
    }
    setCurrentPage(found);
  }

  function goTo(pageNumber: number) {
    const target = Math.min(Math.max(pageNumber, 1), sizes.length);
    const el = pageEls.current[target];
    if (el && scrollRoot) scrollRoot.scrollTo({ top: el.offsetTop - PAGE_GAP, behavior: "smooth" });
  }

  function step(direction: 1 | -1) {
    const index = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    const next = ZOOM_STEPS[Math.min(Math.max((index === -1 ? ZOOM_STEPS.length - 1 : index) + direction, 0), ZOOM_STEPS.length - 1)];
    setZoom(next);
  }

  const iconButton = "p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] disabled:opacity-40 disabled:hover:bg-transparent focus-ring";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-elevated)]" role="dialog" aria-label={name}>
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border-soft)] shrink-0">
        <p className="text-sm font-semibold truncate min-w-0">{name}</p>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {pdf && (
            <>
              <button className={iconButton} onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} aria-label={t("library.pdfPrevPage")} title={t("library.pdfPrevPage")}>
                <ChevronUp size={17} />
              </button>
              <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums px-1 whitespace-nowrap">
                <span className="hidden sm:inline">{t("library.pdfPage")} </span>
                {currentPage} {t("library.pdfOf")} {sizes.length}
              </span>
              <button className={iconButton} onClick={() => goTo(currentPage + 1)} disabled={currentPage >= sizes.length} aria-label={t("library.pdfNextPage")} title={t("library.pdfNextPage")}>
                <ChevronDown size={17} />
              </button>
              <span className="w-px h-5 bg-[var(--border-soft)] mx-1 sm:mx-2" />
              <button className={iconButton} onClick={() => step(-1)} disabled={zoom <= ZOOM_STEPS[0]} aria-label={t("library.pdfZoomOut")} title={t("library.pdfZoomOut")}>
                <ZoomOut size={17} />
              </button>
              <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button className={iconButton} onClick={() => step(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} aria-label={t("library.pdfZoomIn")} title={t("library.pdfZoomIn")}>
                <ZoomIn size={17} />
              </button>
              <button className={cn(iconButton, "hidden sm:block")} onClick={() => setZoom(1)} aria-label={t("library.pdfFitWidth")} title={t("library.pdfFitWidth")}>
                <MoveHorizontal size={17} />
              </button>
              <span className="w-px h-5 bg-[var(--border-soft)] mx-1 sm:mx-2" />
            </>
          )}
          {blobUrl && (
            <a href={blobUrl} download={name} className={iconButton} aria-label={t("library.pdfDownload")} title={t("library.pdfDownload")}>
              <Download size={17} />
            </a>
          )}
          <button onClick={onClose} className={iconButton} aria-label={t("common.close")} title={t("common.close")}>
            <X size={18} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <FileWarning size={28} className="text-[var(--text-secondary)]" />
          <p className="text-sm font-semibold max-w-sm">{error}</p>
          {blobUrl && (
            <a href={blobUrl} download={name} className="text-sm font-semibold text-[var(--color-blue-deep)] hover:underline">
              {t("library.pdfDownload")}
            </a>
          )}
        </div>
      ) : !pdf ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">{t("library.pdfOpening")}</div>
      ) : null}

      <div
        ref={setScrollRoot}
        onScroll={updateCurrentPage}
        className={cn("relative flex-1 overflow-auto bg-[color-mix(in_srgb,var(--color-ink)_9%,var(--bg-elevated))]", (!pdf || error) && "hidden")}
      >
        {pdf && (
          <div className="flex flex-col px-6 py-3" style={{ gap: PAGE_GAP }}>
            {layout.map((size, i) => (
              <PdfPage key={i} pdf={pdf} pageNumber={i + 1} cssWidth={size.width} cssHeight={size.height} scrollRoot={scrollRoot} registerRef={registerRef} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
