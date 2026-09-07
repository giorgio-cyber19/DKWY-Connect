"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addMonths, subMonths, format, isSameMonth } from "date-fns";
import { nl as nlLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Printer, ClipboardList, CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RosterListRow } from "@/components/roster/RosterListRow";
import { RosterSpreadsheet } from "@/components/roster/RosterSpreadsheet";
import { RosterMobileCards } from "@/components/roster/RosterMobileCards";
import { AddMultipleSundaysDialog } from "@/components/roster/AddMultipleSundaysDialog";
import { RosterFilters, emptyRosterFilters, type RosterFilterState } from "@/components/roster/RosterFilters";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { parseDate } from "@/lib/utils";

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextSundayAfter(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return d;
}

const blankFields = {
  sundaySchoolUserIds: [] as string[],
  teenClubUserIds: [] as string[],
  theme: "",
  notes: "",
  serviceType: "",
  preacher: "",
  liturgy: "",
  musicalAccompaniment: "",
};

function RosterPageContent() {
  const { t, language } = useLanguage();
  const dateFnsLocale = language === "nl" ? nlLocale : undefined;
  const { user } = useAuth();
  const rosterEntries = useAppStore((s) => s.rosterEntries);
  const users = useAppStore((s) => s.users);
  const highlightId = useSearchParams().get("highlight");

  const [tab, setTab] = useState("roster");
  const [cursor, setCursor] = useState(() => new Date());
  const [filters, setFilters] = useState<RosterFilterState>(emptyRosterFilters);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [addMultipleOpen, setAddMultipleOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!highlightId) return;
    const entry = rosterEntries.find((r) => r.id === highlightId);
    if (entry) setCursor(parseDate(entry.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  function updateFilters(patch: Partial<RosterFilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  const usingDateRange = !!(filters.dateFrom || filters.dateTo);

  const filtered = useMemo(() => {
    return rosterEntries
      .filter((r) => {
        if (filters.dateFrom && r.date < filters.dateFrom) return false;
        if (filters.dateTo && r.date > filters.dateTo) return false;
        if (filters.userId && !r.sundaySchoolUserIds.includes(filters.userId) && !r.teenClubUserIds.includes(filters.userId)) return false;
        if (filters.search) {
          const haystack = `${r.theme} ${r.notes} ${r.preacher} ${r.liturgy} ${r.musicalAccompaniment}`.toLowerCase();
          if (!haystack.includes(filters.search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rosterEntries, filters]);

  const scopedEntries = useMemo(() => {
    if (usingDateRange) return filtered;
    return filtered.filter((r) => isSameMonth(parseDate(r.date), cursor));
  }, [filtered, usingDateRange, cursor]);

  const myAssignments = useMemo(() => {
    if (!user) return [];
    const today = new Date().toISOString().slice(0, 10);
    return rosterEntries
      .filter((r) => r.date >= today && (r.sundaySchoolUserIds.includes(user.id) || r.teenClubUserIds.includes(user.id)))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rosterEntries, user]);

  const printRangeLabel = usingDateRange
    ? `${filters.dateFrom || "…"} – ${filters.dateTo || "…"}`
    : format(cursor, "MMMM yyyy", { locale: dateFnsLocale });

  async function handleAddRow() {
    const entry = await useAppStore.getState().createRosterEntry({ date: toIsoDate(new Date()), ...blankFields });
    setFocusRowId(entry.id);
  }

  async function handleAddNextSunday() {
    const latest = rosterEntries.reduce((max, r) => (r.date > max ? r.date : max), toIsoDate(new Date()));
    const date = toIsoDate(nextSundayAfter(parseDate(latest)));
    const entry = await useAppStore.getState().createRosterEntry({ date, ...blankFields });
    setFocusRowId(entry.id);
  }

  return (
    <div className="roster-print-area">
      <div className="print-only mb-6">
        <p className="text-sm font-semibold">{t("roster.printHeadingOrg")}</p>
        <p className="text-lg font-bold">{t("roster.printHeadingTitle")}</p>
        <p className="text-sm text-[var(--text-secondary)]">{printRangeLabel}</p>
      </div>

      <div className="no-print">
        <PageHeader
          eyebrow={t("roster.eyebrow")}
          title={t("roster.title")}
          description={t("roster.description")}
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={15} /> {t("roster.printRoster")}
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={() => setAddMultipleOpen(true)}>
                    <CalendarPlus size={15} /> {t("roster.addMultipleSundays")}
                  </Button>
                  <Button variant="outline" onClick={handleAddNextSunday}>
                    <Plus size={15} /> {t("roster.addNextSunday")}
                  </Button>
                  <Button onClick={handleAddRow}>
                    <Plus size={15} /> {t("roster.addRow")}
                  </Button>
                </>
              )}
            </>
          }
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Tabs
              tabs={[
                { id: "roster", label: t("roster.title") },
                { id: "mine", label: t("roster.viewMine") },
              ]}
              active={tab}
              onChange={setTab}
            />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {saveStatus === "saving" ? t("roster.saving") : t("roster.allChangesSaved")}
            </span>
          </div>
          {tab === "roster" && !usingDateRange && (
            <div className="flex items-center gap-3">
              <button onClick={() => setCursor((c) => subMonths(c, 1))} className="p-2 rounded-xl hover:bg-black/5">
                <ChevronLeft size={17} />
              </button>
              <p className="font-display font-semibold text-lg w-36 text-center">{format(cursor, "MMMM yyyy", { locale: dateFnsLocale })}</p>
              <button onClick={() => setCursor((c) => addMonths(c, 1))} className="p-2 rounded-xl hover:bg-black/5">
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>

        {tab === "roster" && <RosterFilters value={filters} onChange={updateFilters} users={users} />}
      </div>

      {tab === "roster" &&
        (scopedEntries.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t("roster.noEntriesTitle")} description={t("roster.noEntriesThisMonth")} />
        ) : (
          <>
            <div className="hidden sm:block">
              <RosterSpreadsheet
                entries={scopedEntries}
                users={users}
                highlightId={highlightId}
                focusRowId={focusRowId}
                isAdmin={isAdmin}
                onSaveStatusChange={setSaveStatus}
              />
            </div>
            <div className="sm:hidden">
              <RosterMobileCards entries={scopedEntries} users={users} isAdmin={isAdmin} />
            </div>
          </>
        ))}

      {tab === "mine" && (
        <>
          <h2 className="no-print font-display text-lg font-semibold mb-4">{t("roster.myAssignmentsTitle")}</h2>
          {myAssignments.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("roster.myAssignmentsEmptyTitle")} description={t("roster.myAssignmentsEmptyDescription")} />
          ) : (
            <div className="space-y-2.5">
              {myAssignments.map((entry) => (
                <RosterListRow key={entry.id} entry={entry} users={users} density="full" />
              ))}
            </div>
          )}
        </>
      )}

      {isAdmin && <AddMultipleSundaysDialog open={addMultipleOpen} onClose={() => setAddMultipleOpen(false)} />}
    </div>
  );
}

export default function RosterPage() {
  return (
    <Suspense fallback={null}>
      <RosterPageContent />
    </Suspense>
  );
}
