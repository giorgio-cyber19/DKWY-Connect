"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Rocket,
  Wrench,
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  BookMarked,
  Sparkles,
  MessagesSquare,
  FolderOpen,
  CalendarDays,
  ClipboardList,
  Settings,
  ShieldCheck,
  CircleHelp,
  Lightbulb,
  Info,
  Printer,
  Search,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/language-context";
import { helpContent, type HelpBlock, type HelpIconId, type HelpSection } from "@/lib/help-content";

const ICONS: Record<HelpIconId, LucideIcon> = {
  rocket: Rocket,
  wrench: Wrench,
  home: LayoutDashboard,
  class: GraduationCap,
  children: Users,
  lessons: BookOpen,
  bible: BookMarked,
  ai: Sparkles,
  updates: MessagesSquare,
  files: FolderOpen,
  calendar: CalendarDays,
  roster: ClipboardList,
  settings: Settings,
  admin: ShieldCheck,
  faq: CircleHelp,
};

/** **bold** and *italic* inside a line of guide text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-[var(--text-primary)]">
            {part.slice(2, -2)}
          </strong>
        ) : part.startsWith("*") && part.length > 2 ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function blockText(block: HelpBlock): string {
  return block.kind === "steps" || block.kind === "list" ? `${block.title ?? ""} ${block.items.join(" ")}` : block.text;
}

function sectionMatches(section: HelpSection, q: string): boolean {
  const haystack = `${section.title} ${section.lead} ${section.blocks.map(blockText).join(" ")}`.replace(/\*/g, "").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function Block({ block, tipLabel, noteLabel }: { block: HelpBlock; tipLabel: string; noteLabel: string }) {
  if (block.kind === "tip" || block.kind === "note") {
    const Icon = block.kind === "tip" ? Lightbulb : Info;
    return (
      <div
        className={
          block.kind === "tip"
            ? "flex gap-3 rounded-2xl p-3.5 bg-[color-mix(in_srgb,var(--color-gold)_13%,transparent)] border border-[color-mix(in_srgb,var(--color-gold)_30%,transparent)]"
            : "flex gap-3 rounded-2xl p-3.5 bg-[color-mix(in_srgb,var(--color-blue)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-blue)_26%,transparent)]"
        }
      >
        <Icon size={17} className={block.kind === "tip" ? "text-[var(--color-gold-deep)] shrink-0 mt-0.5" : "text-[var(--color-blue-deep)] shrink-0 mt-0.5"} />
        <p className="text-[13.5px] leading-relaxed">
          <span className="font-semibold">{block.kind === "tip" ? tipLabel : noteLabel}: </span>
          <Inline text={block.text} />
        </p>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid">
      {block.title && <h3 className="font-display font-semibold text-[15px] mb-2.5">{block.title}</h3>}
      {block.kind === "steps" ? (
        <ol className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-sage-deep)] text-white text-[12px] font-bold flex items-center justify-center mt-px">{i + 1}</span>
              <span className="text-[var(--text-secondary)]">
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] mt-[0.55rem]" />
              <span className="text-[var(--text-secondary)]">
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { language } = useLanguage();
  const content = helpContent[language];
  const [query, setQuery] = useState("");

  const sections = useMemo(() => (query.trim() ? content.sections.filter((s) => sectionMatches(s, query)) : content.sections), [content, query]);

  function jumpTo(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="help-doc">
      <PageHeader
        eyebrow={content.ui.eyebrow}
        title={content.ui.title}
        description={content.ui.description}
        actions={
          <Button variant="outline" onClick={() => window.print()} className="no-print">
            <Printer size={15} /> {content.ui.print}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[15rem_1fr] gap-6 items-start">
        <aside className="no-print lg:sticky lg:top-20 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={content.ui.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] text-sm focus-ring focus:border-[var(--color-gold)]"
            />
          </div>
          <nav aria-label={content.ui.contents} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-2 lg:max-h-[calc(100dvh-11rem)] overflow-y-auto">
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{content.ui.contents}</p>
            <ol>
              {sections.map((s, i) => {
                const Icon = ICONS[s.icon];
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => jumpTo(e, s.id)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] transition-colors focus-ring"
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="truncate">
                        {i + 1}. {s.title.split(":")[0]}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <div className="space-y-5 min-w-0">
          {sections.length === 0 ? (
            <EmptyState icon={Search} title={content.ui.noResultsTitle} description={content.ui.noResultsDescription} />
          ) : (
            sections.map((s, i) => {
              const Icon = ICONS[s.icon];
              return (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <Card hover={false} className="help-card p-5 sm:p-6">
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-sage-deep)_14%,transparent)] text-[var(--color-sage-deep)] flex items-center justify-center">
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display text-xl font-semibold leading-snug">
                          {i + 1}. {s.title}
                        </h2>
                        {s.adminOnly && (
                          <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[var(--color-gold-deep)]">
                            {content.ui.adminBadge}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-5">
                      <Inline text={s.lead} />
                    </p>
                    <div className="space-y-5">
                      {s.blocks.map((b, bi) => (
                        <Block key={bi} block={b} tipLabel={content.ui.tipLabel} noteLabel={content.ui.noteLabel} />
                      ))}
                    </div>
                  </Card>
                </section>
              );
            })
          )}
          <p className="hidden print:block text-center text-[11px] text-[var(--text-secondary)] pt-2">{content.ui.printFooter}</p>
        </div>
      </div>
    </div>
  );
}
