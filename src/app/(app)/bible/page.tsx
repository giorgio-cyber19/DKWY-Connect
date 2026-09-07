"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Bookmark, Trash2 } from "lucide-react";
import { BibleReader } from "@youversion/platform-react-ui";
import type { BibleReaderVerseSelection, BibleReaderHighlightIntent, Highlight } from "@youversion/platform-react-ui";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { isYouVersionConfigured } from "@/components/bible/YouVersionThemeProvider";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import type { SavedVerseHighlight } from "@/lib/types";

const DEFAULT_VERSION_ID = 3034; // Berean Standard Bible (license-free)
const DEFAULT_BOOK = "JHN";
const DEFAULT_CHAPTER = "3";

type HighlightGroup = {
  key: string;
  color: string;
  label: string;
  items: SavedVerseHighlight[];
};

/** Purely a display convenience — merges adjacent same-book/chapter/color verses (e.g. three
 * separately-stored rows for John 3:16, :17, :18) into one "John 3:16-18" row. Storage itself
 * stays one record per verse; see SavedVerseHighlight for why. */
function groupHighlights(list: SavedVerseHighlight[]): HighlightGroup[] {
  const sorted = [...list].sort(
    (a, b) => a.versionId - b.versionId || a.book.localeCompare(b.book) || Number(a.chapter) - Number(b.chapter) || a.verse - b.verse
  );
  const groups: { versionId: number; book: string; chapter: string; color: string; verses: number[]; refPrefix: string; items: SavedVerseHighlight[] }[] = [];
  for (const h of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.versionId === h.versionId && last.book === h.book && last.chapter === h.chapter && last.color === h.color && h.verse === last.verses[last.verses.length - 1] + 1) {
      last.verses.push(h.verse);
      last.items.push(h);
    } else {
      const idx = h.reference.lastIndexOf(":");
      groups.push({
        versionId: h.versionId,
        book: h.book,
        chapter: h.chapter,
        color: h.color,
        verses: [h.verse],
        refPrefix: idx === -1 ? h.reference : h.reference.slice(0, idx),
        items: [h],
      });
    }
  }
  return groups.map((g) => ({
    key: `${g.versionId}:${g.items[0].passageId}`,
    color: g.color,
    label: `${g.refPrefix}:${g.verses.length > 1 ? `${g.verses[0]}-${g.verses[g.verses.length - 1]}` : g.verses[0]}`,
    items: g.items,
  }));
}

export default function BiblePage() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [tab, setTab] = useState<"read" | "saved">("read");
  const [book, setBook] = useState(DEFAULT_BOOK);
  const [chapter, setChapter] = useState(DEFAULT_CHAPTER);
  const [versionId, setVersionId] = useState(DEFAULT_VERSION_ID);
  const [highlights, setHighlights] = useState<SavedVerseHighlight[]>([]);
  const [lastSelection, setLastSelection] = useState<BibleReaderVerseSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isYouVersionConfigured) return;
    apiGet<{ highlights: SavedVerseHighlight[] }>("/api/bible-highlights")
      .then((d) => setHighlights(d.highlights))
      .catch(() => {});
  }, []);

  const readerHighlights = useMemo<Highlight[]>(
    () => highlights.map((h) => ({ version_id: h.versionId, passage_id: h.passageId, color: h.color })),
    [highlights]
  );

  const groups = useMemo(() => groupHighlights(highlights), [highlights]);

  async function handleHighlightApply(intent: BibleReaderHighlightIntent) {
    setError(null);
    const reference =
      lastSelection && lastSelection.book === intent.book && lastSelection.chapter === intent.chapter
        ? lastSelection.reference
        : `${intent.book} ${intent.chapter}:${intent.verses.join(",")}`;
    try {
      const data = await apiPost<{ highlights: SavedVerseHighlight[] }>("/api/bible-highlights", {
        versionId: intent.versionId,
        book: intent.book,
        chapter: intent.chapter,
        verses: intent.verses,
        passageIds: intent.passageIds,
        color: intent.color,
        reference,
      });
      setHighlights(data.highlights);
    } catch (err) {
      setError(translateApiError(err, language));
    }
  }

  async function handleHighlightRemove(intent: BibleReaderHighlightIntent) {
    setError(null);
    try {
      const data = await apiDelete<{ highlights: SavedVerseHighlight[] }>("/api/bible-highlights", {
        versionId: intent.versionId,
        passageIds: intent.passageIds,
      });
      setHighlights(data.highlights);
    } catch (err) {
      setError(translateApiError(err, language));
    }
  }

  async function removeGroup(items: SavedVerseHighlight[]) {
    setError(null);
    const byVersion = new Map<number, string[]>();
    for (const item of items) byVersion.set(item.versionId, [...(byVersion.get(item.versionId) ?? []), item.passageId]);
    try {
      let latest = highlights;
      for (const [vId, passageIds] of byVersion) {
        const data = await apiDelete<{ highlights: SavedVerseHighlight[] }>("/api/bible-highlights", { versionId: vId, passageIds });
        latest = data.highlights;
      }
      setHighlights(latest);
    } catch (err) {
      setError(translateApiError(err, language));
    }
  }

  function openInReader(h: SavedVerseHighlight) {
    setBook(h.book);
    setChapter(h.chapter);
    setVersionId(h.versionId);
    setTab("read");
  }

  return (
    <div>
      <PageHeader eyebrow={t("bible.eyebrow")} title={t("bible.title")} description={t("bible.description")} />

      {!isYouVersionConfigured ? (
        <EmptyState icon={BookMarked} title={t("bible.notConfiguredTitle")} description={t("bible.notConfiguredDescription")} />
      ) : (
        <>
          <Tabs
            tabs={[
              { id: "read", label: t("bible.tabRead") },
              { id: "saved", label: t("bible.tabSavedVerses") },
            ]}
            active={tab}
            onChange={(id) => setTab(id as "read" | "saved")}
            className="mb-6 inline-flex"
          />

          {error && <p className="text-xs text-red-500 font-medium mb-4">{error}</p>}

          {tab === "read" ? (
            <Card className="overflow-hidden" hover={false}>
              <BibleReader.Root
                book={book}
                onBookChange={setBook}
                chapter={chapter}
                onChapterChange={setChapter}
                versionId={versionId}
                onVersionChange={setVersionId}
                background={theme}
                highlights={readerHighlights}
                onVerseSelect={setLastSelection}
                onHighlightApply={handleHighlightApply}
                onHighlightRemove={handleHighlightRemove}
              >
                <BibleReader.Toolbar border="bottom" />
                <div className="max-h-[70vh] overflow-y-auto">
                  <BibleReader.Content />
                </div>
              </BibleReader.Root>
            </Card>
          ) : groups.length === 0 ? (
            <EmptyState icon={Bookmark} title={t("bible.savedVersesEmptyTitle")} description={t("bible.savedVersesEmptyDescription")} />
          ) : (
            <div className="space-y-2.5">
              {groups.map((g) => (
                <Card key={g.key} className="p-4 flex items-center gap-3.5">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: `#${g.color}` }} />
                  <p className="flex-1 min-w-0 text-sm font-semibold truncate">{g.label}</p>
                  <Button variant="outline" size="sm" onClick={() => openInReader(g.items[0])}>
                    {t("bible.goToVerseButton")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeGroup(g.items)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    aria-label={t("bible.removeSavedVerseLabel")}
                  >
                    <Trash2 size={15} />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
