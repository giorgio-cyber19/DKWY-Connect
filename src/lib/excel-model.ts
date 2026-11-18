/**
 * Reads an .xlsx file into a plain model for the Excel-style viewer: values already formatted the way
 * Excel shows them (number / date formats), plus fonts, colours, fills, borders, alignment, merged cells,
 * column widths, row heights and frozen panes. Pure data in, pure data out — no React.
 */

export interface CellBorders {
  t?: string;
  r?: string;
  b?: string;
  l?: string;
}

export interface CellStyle {
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Font size in points. */
  size?: number;
  font?: string;
  align?: "left" | "center" | "right" | "justify";
  valign?: "top" | "middle" | "bottom";
  wrap?: boolean;
  indent?: number;
  borders?: CellBorders;
}

export interface SheetCell {
  /** What the cell shows. */
  text: string;
  /** What the formula bar shows for a non-formula cell; for formulas it is "=…". */
  formulaText: string;
  kind: "text" | "number" | "bool" | "error" | "empty";
  style?: CellStyle;
  link?: string;
  colSpan?: number;
  rowSpan?: number;
  /** True for cells covered by a merged range (drawn by its top-left cell). */
  covered?: boolean;
}

export interface SheetModel {
  name: string;
  rowCount: number;
  colCount: number;
  /** Pixel widths / heights, one per column / row (0 = hidden). */
  colWidths: number[];
  rowHeights: number[];
  cells: (SheetCell | undefined)[][];
  frozenRows: number;
  frozenCols: number;
  showGrid: boolean;
  tabColor?: string;
  /** True when the sheet was larger than what is shown. */
  truncated: boolean;
}

export interface WorkbookModel {
  sheets: SheetModel[];
}

export const MAX_ROWS = 2000;
export const MAX_COLS = 100;
const DEFAULT_COL_PX = 64;
const DEFAULT_ROW_PX = 20;

// ------------------------------------------------------------------ colours

const INDEXED = [
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080",
  "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
  "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF",
  "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99",
  "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696",
  "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333",
];

/** Excel's default (Office) theme: lt1, dk1, lt2, dk2, accent1–6 — used when the file's own theme can't be read. */
const DEFAULT_THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];

function themeFromXml(xml: string | undefined): string[] {
  if (!xml) return DEFAULT_THEME;
  const names = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
  const colours = names.map((name, i) => {
    const block = xml.match(new RegExp(`<a:${name}>([\\s\\S]*?)</a:${name}>`));
    const hex = block?.[1].match(/(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"/)?.[1];
    return hex ? hex.toUpperCase() : DEFAULT_THEME[i];
  });
  return colours;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Applies an Excel "tint" (−1…1: darker … lighter) the way Excel does, in HLS space. */
function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex(hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255);
}

interface ExcelColour {
  argb?: string;
  theme?: number;
  tint?: number;
  indexed?: number;
}

function resolveColour(colour: ExcelColour | undefined, theme: string[]): string | undefined {
  if (!colour) return undefined;
  if (colour.argb) return `#${colour.argb.slice(-6)}`;
  if (typeof colour.theme === "number") return `#${applyTint(theme[colour.theme] ?? "000000", colour.tint ?? 0)}`;
  if (typeof colour.indexed === "number") return `#${INDEXED[colour.indexed] ?? "000000"}`;
  return undefined;
}

// ------------------------------------------------------------------ cell values

const BORDER_CSS: Record<string, string> = {
  thin: "1px solid",
  hair: "1px solid",
  medium: "2px solid",
  thick: "3px solid",
  dotted: "1px dotted",
  dashed: "1px dashed",
  mediumDashed: "2px dashed",
  dashDot: "1px dashed",
  mediumDashDot: "2px dashed",
  dashDotDot: "1px dotted",
  mediumDashDotDot: "2px dotted",
  slantDashDot: "1px dashed",
  double: "3px double",
};

type SSFLike = { format: (fmt: string, value: unknown) => string };

function excelSerial(date: Date): number {
  return (date.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
}

interface RawValue {
  kind: SheetCell["kind"];
  /** Value to hand to the number formatter. */
  value: unknown;
  text: string;
  formula?: string;
  link?: string;
}

function readValue(value: unknown): RawValue {
  if (value === null || value === undefined || value === "") return { kind: "empty", value: "", text: "" };
  if (value instanceof Date) return { kind: "number", value: excelSerial(value), text: "" };
  if (typeof value === "number") return { kind: "number", value, text: "" };
  if (typeof value === "boolean") return { kind: "bool", value, text: value ? "TRUE" : "FALSE" };
  if (typeof value === "string") return { kind: "text", value, text: value };
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("richText" in v && Array.isArray(v.richText)) {
      const text = (v.richText as { text: string }[]).map((r) => r.text).join("");
      return { kind: "text", value: text, text };
    }
    if ("hyperlink" in v) {
      const text = String(typeof v.text === "object" && v.text && "richText" in (v.text as object) ? ((v.text as { richText: { text: string }[] }).richText.map((r) => r.text).join("")) : (v.text ?? v.hyperlink));
      return { kind: "text", value: text, text, link: String(v.hyperlink) };
    }
    if ("error" in v) return { kind: "error", value: String(v.error), text: String(v.error) };
    if ("formula" in v || "sharedFormula" in v) {
      const inner = readValue(v.result);
      const formula = typeof v.formula === "string" ? v.formula : undefined;
      return { ...inner, formula };
    }
  }
  return { kind: "text", value: String(value), text: String(value) };
}

// ------------------------------------------------------------------ the reader

type AnyCell = {
  value: unknown;
  numFmt?: string;
  font?: { bold?: boolean; italic?: boolean; underline?: boolean | string; strike?: boolean; size?: number; name?: string; color?: ExcelColour };
  fill?: { type?: string; pattern?: string; fgColor?: ExcelColour; bgColor?: ExcelColour };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean; indent?: number };
  border?: Record<"top" | "left" | "bottom" | "right", { style?: string; color?: ExcelColour } | undefined>;
};

function colLetters(n: number): string {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** "B3" → { row: 2, col: 1 } (zero-based). */
function parseAddress(ref: string): { row: number; col: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return { row: 0, col: 0 };
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(m[2]) - 1, col: col - 1 };
}

export { colLetters };

export async function parseWorkbook(buffer: ArrayBuffer): Promise<WorkbookModel> {
  const ExcelJS = (await import("exceljs")).default;
  const xlsxModule = await import("xlsx");
  const SSF: SSFLike = (xlsxModule as unknown as { SSF: SSFLike }).SSF ?? (xlsxModule as unknown as { default: { SSF: SSFLike } }).default.SSF;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const themes = (workbook as unknown as { model?: { themes?: Record<string, string> } }).model?.themes;
  const theme = themeFromXml(themes?.theme1);

  const formatNumber = (value: unknown, fmt: string | undefined): string => {
    try {
      return SSF.format(fmt && fmt !== "General" ? fmt : "General", value);
    } catch {
      return String(value);
    }
  };

  const sheets: SheetModel[] = [];
  workbook.eachSheet((ws) => {
    if (ws.state === "hidden" || ws.state === "veryHidden") return;

    const rowCount = Math.min(MAX_ROWS, Math.max(ws.rowCount || 0, 1));
    const colCount = Math.min(MAX_COLS, Math.max(ws.columnCount || 0, 1));
    const truncated = (ws.rowCount || 0) > MAX_ROWS || (ws.columnCount || 0) > MAX_COLS;

    const view = ws.views?.[0] as { state?: string; xSplit?: number; ySplit?: number; showGridLines?: boolean } | undefined;
    const defaultColPx = ws.properties?.defaultColWidth ? Math.round(ws.properties.defaultColWidth * 7 + 5) : DEFAULT_COL_PX;
    const defaultRowPx = ws.properties?.defaultRowHeight ? Math.round(ws.properties.defaultRowHeight * (96 / 72)) : DEFAULT_ROW_PX;

    const colWidths: number[] = [];
    for (let c = 1; c <= colCount; c++) {
      const col = ws.getColumn(c);
      colWidths.push(col.hidden ? 0 : col.width ? Math.round(col.width * 7 + 5) : defaultColPx);
    }
    const rowHeights: number[] = [];
    const cells: (SheetCell | undefined)[][] = [];

    for (let r = 1; r <= rowCount; r++) {
      const row = ws.getRow(r);
      rowHeights.push(row.hidden ? 0 : row.height ? Math.round(row.height * (96 / 72)) : defaultRowPx);
      const line: (SheetCell | undefined)[] = new Array(colCount).fill(undefined);
      row.eachCell({ includeEmpty: true }, (excelCell, colNumber) => {
        if (colNumber > colCount) return;
        const cell = excelCell as unknown as AnyCell;
        const raw = readValue(cell.value);

        let text = raw.text;
        if (raw.kind === "number") text = formatNumber(raw.value, cell.numFmt);
        const formulaText = raw.formula ? `=${raw.formula}` : raw.kind === "number" ? String(raw.value) : raw.text;

        const style: CellStyle = {};
        const font = cell.font;
        if (font) {
          if (font.bold) style.bold = true;
          if (font.italic) style.italic = true;
          if (font.underline) style.underline = true;
          if (font.strike) style.strike = true;
          if (font.size) style.size = font.size;
          if (font.name) style.font = font.name;
          const colour = resolveColour(font.color, theme);
          if (colour) style.color = colour;
        }
        const fill = cell.fill;
        if (fill && fill.type === "pattern" && fill.pattern && fill.pattern !== "none") {
          const colour = resolveColour(fill.pattern === "solid" ? fill.fgColor : (fill.fgColor ?? fill.bgColor), theme);
          if (colour) style.bg = colour;
        }
        const al = cell.alignment;
        if (al) {
          if (al.horizontal === "left" || al.horizontal === "right" || al.horizontal === "center" || al.horizontal === "justify") style.align = al.horizontal;
          if (al.vertical === "top" || al.vertical === "middle" || al.vertical === "bottom") style.valign = al.vertical;
          if (al.wrapText) style.wrap = true;
          if (al.indent) style.indent = al.indent;
        }
        const border = cell.border;
        if (border) {
          const borders: CellBorders = {};
          const side = (b: { style?: string; color?: ExcelColour } | undefined) => (b?.style ? `${BORDER_CSS[b.style] ?? "1px solid"} ${resolveColour(b.color, theme) ?? "#000"}` : undefined);
          borders.t = side(border.top);
          borders.r = side(border.right);
          borders.b = side(border.bottom);
          borders.l = side(border.left);
          if (borders.t || borders.r || borders.b || borders.l) style.borders = borders;
        }

        const hasStyle = Object.keys(style).length > 0;
        if (raw.kind === "empty" && !hasStyle) return;
        line[colNumber - 1] = { text, formulaText, kind: raw.kind, style: hasStyle ? style : undefined, link: raw.link };
      });
      cells.push(line);
    }

    // merged ranges: the top-left cell spans, the others are covered
    const merges = ((ws as unknown as { model?: { merges?: string[] } }).model?.merges ?? []) as string[];
    for (const range of merges) {
      const [from, to] = range.split(":");
      if (!to) continue;
      const a = parseAddress(from);
      const b = parseAddress(to);
      if (a.row >= rowCount || a.col >= colCount) continue;
      const lastRow = Math.min(b.row, rowCount - 1);
      const lastCol = Math.min(b.col, colCount - 1);
      const origin = cells[a.row][a.col] ?? { text: "", formulaText: "", kind: "empty" as const };
      origin.colSpan = lastCol - a.col + 1;
      origin.rowSpan = lastRow - a.row + 1;
      cells[a.row][a.col] = origin;
      for (let r = a.row; r <= lastRow; r++) {
        for (let c = a.col; c <= lastCol; c++) {
          if (r === a.row && c === a.col) continue;
          cells[r][c] = { text: "", formulaText: "", kind: "empty", covered: true };
        }
      }
    }

    const tab = (ws.properties as { tabColor?: ExcelColour } | undefined)?.tabColor;
    sheets.push({
      name: ws.name,
      rowCount,
      colCount,
      colWidths,
      rowHeights,
      cells,
      frozenRows: view?.state === "frozen" ? Math.min(view.ySplit ?? 0, rowCount) : 0,
      frozenCols: view?.state === "frozen" ? Math.min(view.xSplit ?? 0, colCount) : 0,
      showGrid: view?.showGridLines !== false,
      tabColor: resolveColour(tab, theme),
      truncated,
    });
  });

  return { sheets };
}
