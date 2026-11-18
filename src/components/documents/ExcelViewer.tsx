"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, FileWarning } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { parseWorkbook, colLetters, type SheetCell, type SheetModel, type WorkbookModel } from "@/lib/excel-model";
import { cn } from "@/lib/utils";

/**
 * Spreadsheets shown the way Microsoft Excel shows them: column letters and row numbers, gridlines, the
 * Name Box and formula bar, a green selected cell you can move with the arrow keys, frozen panes, merged
 * cells, the file's own fonts, colours, fills, borders and number formats, sheet tabs at the bottom and
 * a zoom control in the status bar. View-only — editing happens in Google Drive.
 */

const EXCEL_GREEN = "#217346";
const GRID = "#d4d4d4";
const HEADER_BG = "#f3f3f3";
const HEADER_ACTIVE_BG = "#d2ecdd";
const HEADER_H = 22;
const MIN_VIEW_ROWS = 40;
const MIN_VIEW_COLS = 16;
const DEFAULT_COL_PX = 64;
const DEFAULT_ROW_PX = 20;
const ZOOMS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2];

const FONT_FALLBACKS: Record<string, string> = {
  calibri: 'Calibri, Carlito, "Segoe UI", system-ui, sans-serif',
  arial: "Arial, Helvetica, sans-serif",
  "times new roman": '"Times New Roman", Times, serif',
  "courier new": '"Courier New", monospace',
  verdana: "Verdana, sans-serif",
  tahoma: "Tahoma, sans-serif",
  cambria: "Cambria, Georgia, serif",
  "segoe ui": '"Segoe UI", system-ui, sans-serif',
};

function fontFamily(name: string | undefined): string {
  if (!name) return FONT_FALLBACKS.calibri;
  return FONT_FALLBACKS[name.toLowerCase()] ?? `"${name}", Calibri, "Segoe UI", system-ui, sans-serif`;
}

/** The cell's own text colour/alignment etc. as CSS (before borders). */
function cellCss(cell: SheetCell | undefined): React.CSSProperties {
  const style = cell?.style;
  const css: React.CSSProperties = { fontFamily: fontFamily(style?.font), fontSize: `${style?.size ?? 11}pt` };
  if (style?.bg) css.background = style.bg;
  css.color = style?.color ?? "#000";
  if (style?.bold) css.fontWeight = 700;
  if (style?.italic) css.fontStyle = "italic";
  const decorations = [style?.underline && "underline", style?.strike && "line-through"].filter(Boolean).join(" ");
  if (decorations) css.textDecoration = decorations;
  const align = style?.align ?? (cell?.kind === "number" ? "right" : cell?.kind === "bool" || cell?.kind === "error" ? "center" : "left");
  css.textAlign = align;
  css.verticalAlign = style?.valign === "top" ? "top" : style?.valign === "middle" ? "middle" : "bottom";
  if (style?.indent) css.paddingLeft = 3 + style.indent * 9;
  return css;
}

/** The next zoom level up or down from `zoom`. */
function stepZoom(zoom: number, direction: 1 | -1): number {
  const index = ZOOMS.findIndex((z) => z >= zoom - 0.001);
  const current = index === -1 ? ZOOMS.length - 1 : index;
  return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, current + direction))];
}

export function ExcelViewer({ buffer }: { buffer: ArrayBuffer }) {
  const { t } = useLanguage();
  const [model, setModel] = useState<WorkbookModel | null>(null);
  const [error, setError] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selected, setSelected] = useState({ r: 0, c: 0 });
  const [zoom, setZoom] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    parseWorkbook(buffer)
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch((err) => {
        console.error("Excel viewer failed:", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [buffer]);

  const sheet: SheetModel | undefined = model?.sheets[sheetIndex];

  const layout = useMemo(() => {
    if (!sheet) return null;
    const viewRows = Math.max(sheet.rowCount, MIN_VIEW_ROWS);
    const viewCols = Math.max(sheet.colCount, MIN_VIEW_COLS);
    const colWidths = Array.from({ length: viewCols }, (_, c) => sheet.colWidths[c] ?? DEFAULT_COL_PX);
    const rowHeights = Array.from({ length: viewRows }, (_, r) => sheet.rowHeights[r] ?? DEFAULT_ROW_PX);
    const rowHeaderW = Math.max(40, String(viewRows).length * 9 + 22);
    // Offsets for frozen panes: where each frozen row / column sticks.
    const stickyTop: number[] = [];
    let top = HEADER_H;
    for (let r = 0; r < sheet.frozenRows; r++) {
      stickyTop.push(top);
      top += rowHeights[r];
    }
    const stickyLeft: number[] = [];
    let left = rowHeaderW;
    for (let c = 0; c < sheet.frozenCols; c++) {
      stickyLeft.push(left);
      left += colWidths[c];
    }
    return { viewRows, viewCols, colWidths, rowHeights, rowHeaderW, stickyTop, stickyLeft, tableWidth: rowHeaderW + colWidths.reduce((a, b) => a + b, 0) };
  }, [sheet]);

  function cellAt(r: number, c: number): SheetCell | undefined {
    return sheet?.cells[r]?.[c];
  }

  /** Borders as Excel draws them: a border on the cell below/right is drawn by the cell above/left. */
  function bordersFor(r: number, c: number): Pick<React.CSSProperties, "borderTop" | "borderRight" | "borderBottom" | "borderLeft"> {
    const own = cellAt(r, c)?.style?.borders;
    const grid = sheet?.showGrid === false ? "1px solid transparent" : `1px solid ${GRID}`;
    return {
      borderTop: r === 0 ? (own?.t ?? grid) : undefined,
      borderLeft: c === 0 ? (own?.l ?? grid) : undefined,
      borderRight: own?.r ?? cellAt(r, c + 1)?.style?.borders?.l ?? grid,
      borderBottom: own?.b ?? cellAt(r + 1, c)?.style?.borders?.t ?? grid,
    };
  }

  function move(dr: number, dc: number) {
    if (!layout) return;
    setSelected((s) => {
      const next = { r: Math.min(layout.viewRows - 1, Math.max(0, s.r + dr)), c: Math.min(layout.viewCols - 1, Math.max(0, s.c + dc)) };
      requestAnimationFrame(() => gridRef.current?.querySelector(`[data-cell="${next.r}-${next.c}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" }));
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Enter: [1, 0], Tab: [0, 1], PageDown: [20, 0], PageUp: [-20, 0] };
    const step = keys[e.key];
    if (step) {
      e.preventDefault();
      move(e.shiftKey && (e.key === "Tab" || e.key === "Enter") ? -step[0] : step[0], e.shiftKey && (e.key === "Tab" || e.key === "Enter") ? -step[1] : step[1]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelected((s) => ({ r: e.ctrlKey ? 0 : s.r, c: 0 }));
    }
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <FileWarning size={28} className="text-[var(--text-secondary)]" />
        <p className="text-sm font-semibold">{t("documents.errorUnreadable")}</p>
      </div>
    );
  }
  if (!model || !sheet || !layout) {
    return <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">{t("documents.openingDocument")}</div>;
  }

  const selectedCell = cellAt(selected.r, selected.c);
  const nameBox = `${colLetters(selected.c + 1)}${selected.r + 1}`;

  return (
    <div className="excel-viewer flex-1 min-h-0 flex flex-col bg-white text-[#201f1e]" style={{ colorScheme: "light" }}>
      {/* Name Box + formula bar */}
      <div className="flex items-stretch border-b shrink-0 text-[13px]" style={{ borderColor: GRID, background: "#fff" }}>
        <div className="w-24 sm:w-28 px-3 py-1.5 border-r font-semibold tabular-nums" style={{ borderColor: GRID }} aria-label="Name box">
          {nameBox}
        </div>
        <div className="px-3 py-1.5 italic text-[#777] border-r select-none" style={{ borderColor: GRID }}>
          fx
        </div>
        <div className="flex-1 min-w-0 px-3 py-1.5 truncate" title={selectedCell?.formulaText}>
          {selectedCell?.formulaText ?? ""}
        </div>
      </div>

      {/* The grid */}
      <div ref={gridRef} tabIndex={0} onKeyDown={onKeyDown} className="flex-1 min-h-0 overflow-auto relative outline-none bg-white">
        <table
          style={{ zoom, width: layout.tableWidth, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontFamily: FONT_FALLBACKS.calibri }}
          aria-label={sheet.name}
        >
          <colgroup>
            <col style={{ width: layout.rowHeaderW }} />
            {layout.colWidths.map((w, c) => (
              <col key={c} style={{ width: w, visibility: w === 0 ? "collapse" : undefined }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: HEADER_H }}>
              <th
                className="sticky top-0 left-0"
                style={{ zIndex: 5, background: HEADER_BG, borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}`, width: layout.rowHeaderW }}
              />
              {layout.colWidths.map((w, c) => {
                const active = c === selected.c;
                return (
                  <th
                    key={c}
                    onClick={() => setSelected((s) => ({ ...s, c }))}
                    className="sticky top-0 text-[12px] font-normal select-none cursor-default"
                    style={{
                      zIndex: c < sheet.frozenCols ? 4 : 3,
                      left: c < sheet.frozenCols ? layout.stickyLeft[c] : undefined,
                      background: active ? HEADER_ACTIVE_BG : HEADER_BG,
                      color: active ? EXCEL_GREEN : "#444",
                      fontWeight: active ? 700 : 400,
                      borderRight: `1px solid ${GRID}`,
                      borderBottom: active ? `2px solid ${EXCEL_GREEN}` : `1px solid ${GRID}`,
                      height: HEADER_H,
                    }}
                  >
                    {w > 0 ? colLetters(c + 1) : ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {layout.rowHeights.map((h, r) => {
              if (h === 0) return null;
              const rowActive = r === selected.r;
              const frozenRow = r < sheet.frozenRows;
              return (
                <tr key={r} style={{ height: h }}>
                  <th
                    onClick={() => setSelected((s) => ({ ...s, r }))}
                    className="sticky left-0 text-[12px] font-normal select-none cursor-default"
                    style={{
                      zIndex: frozenRow ? 4 : 2,
                      top: frozenRow ? layout.stickyTop[r] : undefined,
                      background: rowActive ? HEADER_ACTIVE_BG : HEADER_BG,
                      color: rowActive ? EXCEL_GREEN : "#444",
                      fontWeight: rowActive ? 700 : 400,
                      borderRight: rowActive ? `2px solid ${EXCEL_GREEN}` : `1px solid ${GRID}`,
                      borderBottom: `1px solid ${GRID}`,
                    }}
                  >
                    {r + 1}
                  </th>
                  {layout.colWidths.map((w, c) => {
                    const cell = cellAt(r, c);
                    if (cell?.covered || w === 0) return null;
                    const isSelected = r === selected.r && c === selected.c;
                    const frozenCol = c < sheet.frozenCols;
                    const sticky = frozenRow || frozenCol;
                    const next = cellAt(r, c + 1);
                    const wrap = cell?.style?.wrap;
                    // Plain text runs on over empty cells to its right, as in Excel.
                    const spills = !!cell?.text && cell.kind === "text" && !wrap && !cell.colSpan && (cell.style?.align ?? "left") === "left" && !next?.text && !next?.covered && !next?.style?.bg;
                    const css: React.CSSProperties = {
                      ...cellCss(cell),
                      ...bordersFor(r, c),
                      padding: "0 3px",
                      whiteSpace: wrap ? "pre-wrap" : "nowrap",
                      overflow: spills ? "visible" : "hidden",
                      textOverflow: "clip",
                      overflowWrap: wrap ? "anywhere" : undefined,
                      lineHeight: 1.25,
                      cursor: "cell",
                      boxShadow: isSelected ? `inset 0 0 0 2px ${EXCEL_GREEN}` : undefined,
                      position: sticky ? "sticky" : spills ? "relative" : undefined,
                      zIndex: isSelected ? 2 : sticky ? (frozenRow && frozenCol ? 3 : 1) : spills ? 1 : undefined,
                      top: frozenRow ? layout.stickyTop[r] : undefined,
                      left: frozenCol ? layout.stickyLeft[c] : undefined,
                    };
                    if (sticky && !css.background) css.background = "#fff";
                    const href = cell?.link && /^https?:\/\//i.test(cell.link) ? cell.link : undefined;
                    return (
                      <td
                        key={c}
                        data-cell={`${r}-${c}`}
                        colSpan={cell?.colSpan}
                        rowSpan={cell?.rowSpan}
                        onClick={() => {
                          setSelected({ r, c });
                          gridRef.current?.focus({ preventScroll: true });
                        }}
                        style={css}
                      >
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#0563c1", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
                            {cell?.text}
                          </a>
                        ) : (
                          cell?.text
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs and status bar */}
      <div className="flex items-stretch justify-between shrink-0 border-t text-[12px]" style={{ borderColor: GRID, background: HEADER_BG }}>
        <div className="flex items-stretch min-w-0 overflow-x-auto no-scrollbar">
          {model.sheets.map((s, i) => {
            const active = i === sheetIndex;
            return (
              <button
                key={s.name + i}
                onClick={() => {
                  setSheetIndex(i);
                  setSelected({ r: 0, c: 0 });
                  gridRef.current?.scrollTo({ top: 0, left: 0 });
                }}
                className="px-4 py-1.5 whitespace-nowrap transition-colors focus-ring"
                style={{
                  background: active ? "#fff" : "transparent",
                  color: active ? EXCEL_GREEN : "#444",
                  fontWeight: active ? 700 : 400,
                  borderTop: active ? "none" : "none",
                  borderBottom: `3px solid ${active ? (s.tabColor ?? EXCEL_GREEN) : (s.tabColor ?? "transparent")}`,
                  borderRight: `1px solid ${GRID}`,
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 px-3 shrink-0">
          {sheet.truncated && <span className="text-[11px] text-[#a05a00] hidden sm:inline">{t("documents.sheetTruncated")}</span>}
          <button
            className={cn("p-1 rounded hover:bg-black/10 disabled:opacity-40")}
            onClick={() => setZoom((z) => stepZoom(z, -1))}
            disabled={zoom <= ZOOMS[0]}
            aria-label={t("library.pdfZoomOut")}
            title={t("library.pdfZoomOut")}
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-9 text-center tabular-nums text-[#444]">{Math.round(zoom * 100)}%</span>
          <button
            className="p-1 rounded hover:bg-black/10 disabled:opacity-40"
            onClick={() => setZoom((z) => stepZoom(z, 1))}
            disabled={zoom >= ZOOMS[ZOOMS.length - 1]}
            aria-label={t("library.pdfZoomIn")}
            title={t("library.pdfZoomIn")}
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
