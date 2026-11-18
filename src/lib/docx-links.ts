/**
 * Word stores a hyperlink in two ways: as a <w:hyperlink> (what the viewer understands) and as a "field"
 * (HYPERLINK "https://…" — typed by hand, pasted from another program, or made by some editors). The viewer
 * drops the field kind: no link, and sometimes not even the text. This rewrites field hyperlinks into the
 * normal kind before the file is shown. Pure file-in, file-out; anything unexpected leaves the file untouched.
 */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const HYPERLINK_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";

interface Target {
  url?: string;
  anchor?: string;
}

/** `HYPERLINK "https://x" \o "tip"` / `HYPERLINK \l "bookmark"` → where it points. null for any other field. */
export function parseHyperlinkInstruction(instruction: string): Target | null {
  const text = instruction.trim();
  if (!/^HYPERLINK\b/i.test(text)) return null;
  const rest = text.replace(/^HYPERLINK\s*/i, "");
  const anchor = rest.match(/\\l\s+"([^"]+)"/i)?.[1];
  const url = rest.match(/^"([^"]+)"/)?.[1] ?? (rest.startsWith("\\") ? undefined : rest.match(/^(\S+)/)?.[1]);
  if (!url && !anchor) return null;
  return { url, anchor };
}

function children(el: Element, localName: string): Element[] {
  return Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === localName && (n as Element).namespaceURI === W);
}

export async function fixDocxLinks(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const documentFile = zip.file("word/document.xml");
    const relsFile = zip.file("word/_rels/document.xml.rels");
    if (!documentFile || !relsFile) return buffer;

    const xml = await documentFile.async("string");
    if (!/HYPERLINK/i.test(xml)) return buffer; // nothing to rewrite

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return buffer;
    const rels = new DOMParser().parseFromString(await relsFile.async("string"), "application/xml");
    const relRoot = rels.documentElement;

    let counter = 0;
    const urls = new Map<string, string>();
    const relationshipFor = (url: string): string => {
      const known = urls.get(url);
      if (known) return known;
      const id = `rIdDwkyLink${++counter}`;
      const rel = rels.createElementNS(REL_NS, "Relationship");
      rel.setAttribute("Id", id);
      rel.setAttribute("Type", HYPERLINK_REL);
      rel.setAttribute("Target", url);
      rel.setAttribute("TargetMode", "External");
      relRoot.appendChild(rel);
      urls.set(url, id);
      return id;
    };
    const makeHyperlink = (target: Target): Element => {
      const link = doc.createElementNS(W, "w:hyperlink");
      if (target.url) link.setAttributeNS(R, "r:id", relationshipFor(target.url));
      else if (target.anchor) link.setAttributeNS(W, "w:anchor", target.anchor);
      return link;
    };

    let changed = false;

    // 1) <w:fldSimple w:instr="HYPERLINK …">runs</w:fldSimple>
    for (const field of Array.from(doc.getElementsByTagNameNS(W, "fldSimple"))) {
      const target = parseHyperlinkInstruction(field.getAttributeNS(W, "instr") ?? field.getAttribute("w:instr") ?? "");
      if (!target) continue;
      const link = makeHyperlink(target);
      for (const run of children(field, "r")) link.appendChild(run);
      field.parentNode?.replaceChild(link, field);
      changed = true;
    }

    // 2) begin / instrText / separate … display runs … end, inside one paragraph
    const hasDisplayContent = (run: Element) =>
      Array.from(run.childNodes).some((n) => n.nodeType === 1 && !["rPr", "fldChar", "instrText"].includes((n as Element).localName));

    for (const paragraph of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
      let depth = 0;
      let instruction = "";
      let controls: { el: Element; run: Element }[] = [];
      let link: Element | null = null;
      let separated = false;

      for (const node of Array.from(paragraph.childNodes)) {
        if (node.nodeType !== 1 || (node as Element).localName !== "r") continue;
        const run = node as Element;

        // A run can carry control characters, text, or both; walk its parts in order.
        for (const part of Array.from(run.childNodes)) {
          if (part.nodeType !== 1) continue;
          const el = part as Element;
          if (el.localName === "fldChar") {
            const type = el.getAttributeNS(W, "fldCharType") ?? el.getAttribute("w:fldCharType");
            if (type === "begin") {
              depth++;
              if (depth === 1) {
                instruction = "";
                controls = [{ el, run }];
                link = null;
                separated = false;
              }
            } else if (type === "separate" && depth === 1) {
              controls.push({ el, run });
              separated = true;
              const target = parseHyperlinkInstruction(instruction);
              if (target) {
                link = makeHyperlink(target);
                paragraph.insertBefore(link, run);
              }
            } else if (type === "end") {
              if (depth === 1) {
                controls.push({ el, run });
                if (link) {
                  // A hyperlink field: drop its control characters; runs left empty go too.
                  for (const control of controls) control.el.parentNode?.removeChild(control.el);
                  for (const control of controls) {
                    if (control.run.parentNode && !hasDisplayContent(control.run)) control.run.parentNode.removeChild(control.run);
                  }
                  changed = true;
                }
                link = null;
                separated = false;
                controls = [];
              }
              depth = Math.max(0, depth - 1);
            }
          } else if (el.localName === "instrText" && depth === 1 && !separated) {
            instruction += el.textContent ?? "";
            controls.push({ el, run });
          }
        }

        // The visible runs of a hyperlink field move inside the new <w:hyperlink>.
        if (link && separated && depth === 1 && run.parentNode === paragraph && hasDisplayContent(run)) link.appendChild(run);
      }
    }

    if (!changed) return buffer;
    const serializer = new XMLSerializer();
    zip.file("word/document.xml", serializer.serializeToString(doc));
    zip.file("word/_rels/document.xml.rels", serializer.serializeToString(rels));
    return await zip.generateAsync({ type: "arraybuffer" });
  } catch (err) {
    console.error("Couldn't rewrite hyperlink fields; showing the file as it is:", err);
    return buffer;
  }
}
