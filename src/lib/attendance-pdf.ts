import type { jsPDF } from "jspdf";
import { buildReport, pdfFileName } from "./attendance-report";
import type { AttendanceRecord, AttendanceStatus, Child } from "./types";

/** Builds and downloads the attendance PDF in the browser. The PDF libraries are only loaded when this is called. */

export interface PdfLabels {
  title: string;
  classLabel: string;
  periodLabel: string;
  generatedOn: string;
  page: string;
  of: string;
  name: string;
  present: string;
  /** Short heading for the "times present" column. */
  presentShort: string;
  absent: string;
  excused: string;
  /** One letter shown for "excused" cells, e.g. V / E. */
  excusedLetter: string;
  visitors: string;
  notRecorded: string;
  notes: string;
  recordedBy: string;
  sundays: string;
}

export interface AttendancePdfOptions {
  className: string;
  records: AttendanceRecord[];
  pupils: Child[];
  labels: PdfLabels;
  /** "short" → "8 nov", "long" → "zondag 8 november 2026". */
  formatDate: (iso: string, style: "short" | "long") => string;
  userName: (id: string | undefined) => string | undefined;
  /** Already formatted, e.g. "9 november 2026". */
  generatedOn: string;
}

type RGB = [number, number, number];
const GREEN: RGB = [47, 143, 91];
const RED: RGB = [214, 69, 69];
const GOLD: RGB = [176, 124, 24];
const INK: RGB = [30, 41, 59];
const MUTED: RGB = [110, 118, 130];
const HEAD: RGB = [38, 92, 66];
const FILL: Record<AttendanceStatus, RGB> = { present: [228, 244, 235], absent: [253, 232, 232], excused: [250, 241, 214] };
const COLOR: Record<AttendanceStatus, RGB> = { present: GREEN, absent: RED, excused: GOLD };

type CellMark = AttendanceStatus | null;

/** A tick (for "present") centred on (cx, cy); nothing for anyone who wasn't there. */
function drawGlyph(doc: jsPDF, mark: CellMark, cx: number, cy: number) {
  if (mark === "present") {
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.55);
    doc.line(cx - 1.6, cy + 0.1, cx - 0.5, cy + 1.3);
    doc.line(cx - 0.5, cy + 1.3, cx + 1.8, cy - 1.5);
  }
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30;
}

function addPageNumbers(doc: jsPDF, labels: PdfLabels) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${labels.page} ${i} ${labels.of} ${total}`, w / 2, h - 7, { align: "center" });
  }
}

function drawHeader(doc: jsPDF, title: string, lines: string[], right?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(title, 12, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  lines.forEach((line, i) => doc.text(line, 12, 21 + i * 4.6));
  if (right) {
    doc.setFontSize(8.5);
    doc.text(right, w - 12, 15, { align: "right" });
  }
  doc.setDrawColor(...HEAD);
  doc.setLineWidth(0.6);
  doc.line(12, 21 + lines.length * 4.6 - 1.4, w - 12, 21 + lines.length * 4.6 - 1.4);
}

async function loadLibs() {
  const [{ jsPDF: JsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { JsPDF, autoTable: autoTableModule.default };
}

export async function downloadAttendancePdf(opts: AttendancePdfOptions): Promise<void> {
  if (opts.records.length === 0) return;
  const { JsPDF, autoTable } = await loadLibs();
  const { labels } = opts;
  const report = buildReport(opts.records, opts.pupils);
  const dates = report.records.map((r) => r.date);
  const n = dates.length;
  const single = n === 1;
  const doc = new JsPDF({ orientation: single || n <= 5 ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const subtitle = [`${labels.classLabel}: ${opts.className}`];
  subtitle.push(
    single
      ? opts.formatDate(dates[0], "long")
      : `${labels.periodLabel}: ${opts.formatDate(dates[0], "long")} – ${opts.formatDate(dates[n - 1], "long")} · ${n} ${labels.sundays}`
  );
  const right = `${labels.generatedOn} ${opts.generatedOn}`;
  const headerHeight = 21 + subtitle.length * 4.6 + 3;

  if (single) {
    const record = report.records[0];
    const total = report.totals[0];
    drawHeader(doc, labels.title, subtitle, right);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    let x = 12;
    doc.setTextColor(...COLOR.present);
    const presentText = `${total.present} ${labels.present.toLowerCase()}`;
    doc.text(presentText, x, headerHeight + 4);
    x += doc.getTextWidth(presentText) + 8;
    if (record.visitors > 0) {
      doc.setTextColor(...MUTED);
      doc.text(`${record.visitors} ${labels.visitors.toLowerCase()}`, x, headerHeight + 4);
    }

    autoTable(doc, {
      startY: headerHeight + 9,
      head: [["#", labels.name]],
      body: report.rows.map((r, i) => [String(i + 1), r.child.name]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.4, lineColor: [225, 228, 232], lineWidth: 0.1, textColor: INK },
      headStyles: { fillColor: HEAD, textColor: 255, fontSize: 9 },
      columnStyles: { 0: { cellWidth: 12, halign: "center", textColor: MUTED } },
      margin: { left: 12, right: 12, bottom: 16 },
    });

    let y = lastTableY(doc) + 8;
    const noteLines = record.note ? doc.splitTextToSize(record.note, pageW - 24) : [];
    if (y + 10 + noteLines.length * 5 > pageH - 18) {
      doc.addPage();
      y = 20;
    }
    if (record.note) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(labels.notes, 12, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(noteLines, 12, y + 5);
      y += 5 + noteLines.length * 5 + 3;
    }
    const by = opts.userName(record.updatedBy ?? record.takenBy);
    if (by) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`${labels.recordedBy} ${by}`, 12, y);
    }
  } else {
    // ---- many Sundays: one row per child, one column per Sunday
    const usable = pageW - 24;
    const nameW = 50;
    const sumW = 15;
    const dateW = Math.min(16, Math.max(10, (usable - nameW - sumW * 2) / n));

    autoTable(doc, {
      startY: headerHeight + 2,
      head: [
        [
          { content: labels.name, styles: { halign: "left" } },
          ...dates.map((d) => `${opts.formatDate(d, "short")}\n${d.slice(0, 4)}`),
          { content: labels.presentShort, styles: { halign: "center" } },
          "%",
        ],
      ],
      body: report.rows.map((r) => [
        r.child.name,
        ...r.marks.map((m) => ({ content: "", status: m ?? "none" }) as never),
        `${r.present}/${r.counted}`,
        r.percent === null ? "–" : `${r.percent}%`,
      ]),
      foot: [
        [{ content: labels.present, styles: { halign: "left" } }, ...report.totals.map((t) => String(t.present)), "", ""],
        [{ content: labels.visitors, styles: { halign: "left" } }, ...report.totals.map((t) => String(t.visitors)), "", ""],
      ],
      showFoot: "lastPage",
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [225, 228, 232], lineWidth: 0.1, valign: "middle", textColor: INK, overflow: "ellipsize" },
      headStyles: { fillColor: HEAD, textColor: 255, halign: "center", fontSize: 7.5, fontStyle: "bold" },
      footStyles: { fillColor: [241, 243, 245], textColor: INK, halign: "center", fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: nameW, halign: "left" },
        ...Object.fromEntries(dates.map((_, i) => [i + 1, { cellWidth: dateW, halign: "center" }])),
        [n + 1]: { cellWidth: sumW, halign: "center", textColor: MUTED },
        [n + 2]: { cellWidth: sumW, halign: "center", fontStyle: "bold" },
      },
      margin: { left: 12, right: 12, top: headerHeight + 2, bottom: 16 },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
      didDrawPage: () => drawHeader(doc, labels.title, subtitle, right),
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index < 1 || data.column.index > n) return;
        const status = (data.cell.raw as { status?: AttendanceStatus | "none" } | null)?.status;
        if (status === "present") data.cell.styles.fillColor = FILL.present;
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index < 1 || data.column.index > n) return;
        const status = (data.cell.raw as { status?: AttendanceStatus | "none" } | null)?.status;
        drawGlyph(doc, status && status !== "none" ? status : null, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2);
      },
    });

    // legend
    let y = lastTableY(doc) + 7;
    if (y > pageH - 24) {
      doc.addPage();
      y = 22;
    }
    doc.setFontSize(8.5);
    let x = 12;
    for (const [mark, label] of [["present", labels.present]] as [CellMark, string][]) {
      drawGlyph(doc, mark, x + 1.8, y - 1);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(label, x + 5, y);
      x += 5 + doc.getTextWidth(label) + 8;
    }

    // notes
    const withNotes = report.records.filter((r) => r.note);
    if (withNotes.length > 0) {
      autoTable(doc, {
        startY: y + 6,
        head: [[opts.labels.notes, ""]],
        body: withNotes.map((r) => [opts.formatDate(r.date, "short") + " " + r.date.slice(0, 4), r.note ?? ""]),
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [225, 228, 232], lineWidth: 0.1, textColor: INK },
        headStyles: { fillColor: HEAD, textColor: 255 },
        columnStyles: { 0: { cellWidth: 34 } },
        margin: { left: 12, right: 12, top: headerHeight + 2, bottom: 16 },
        didDrawPage: () => drawHeader(doc, labels.title, subtitle, right),
      });
    }
  }

  addPageNumbers(doc, labels);
  doc.save(pdfFileName(opts.className, dates));
}
