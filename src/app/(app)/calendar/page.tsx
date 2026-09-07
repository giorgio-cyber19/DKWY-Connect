"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { nl as nlLocale } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, ClipboardList, Palmtree, Flag, CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { parseDate, formatDate, cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import { translateApiError } from "@/lib/i18n/errors";
import { eventTypeColors } from "@/lib/calendar-colors";
import { holidaysOnDay, isVacationLabelDay } from "@/lib/holidays";
import { HolidaysManager } from "@/components/calendar/HolidaysManager";
import type { CalendarEvent, Holiday } from "@/lib/types";

const HOLIDAY_COLORS: Record<Holiday["type"], string> = {
  school_vacation: "var(--color-sage-deep)",
  national_holiday: "var(--color-coral-deep)",
};

const eventTypes: CalendarEvent["type"][] = [
  "Sunday Lesson",
  "Teacher Meeting",
  "Children Event",
  "Holiday Program",
  "VBS",
  "Birthday",
  "Parent Meeting",
  "Sunday School & Youth Roster",
];

// Roster-origin events are only ever created by the Roster feature — excluded
// here so a plain user can't hand-create a fake roster-type event.
const manualEventTypes = eventTypes.filter((et) => et !== "Sunday School & Youth Roster");

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

function NewEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEvent["type"]>("Sunday Lesson");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().createEvent({
        title: title.trim(),
        type,
        date,
        time: time || undefined,
        location: location || undefined,
        description: description || undefined,
        color: eventTypeColors[type],
      });
      setTitle("");
      setTime("");
      setLocation("");
      setDescription("");
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("calendar.newEventModalTitle")} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.eventTitleLabel")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("calendar.eventTitlePlaceholder")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.type")}</label>
          <select value={type} onChange={(e) => setType(e.target.value as CalendarEvent["type"])} className={inputClass}>
            {manualEventTypes.map((et) => (
              <option key={et} value={et}>
                {enumLabels.eventType[language][et]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.timeOptionalLabel")}</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.locationOptionalLabel")}</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder={t("calendar.locationPlaceholder")} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("calendar.descriptionOptionalLabel")}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <Button className="w-full" onClick={submit} loading={submitting} disabled={!title.trim() || submitting}>
          {t("calendar.addEventButton")}
        </Button>
      </div>
    </Modal>
  );
}

function CalendarPageContent() {
  const { t, language } = useLanguage();
  const dateFnsLocale = language === "nl" ? nlLocale : undefined;
  const { user } = useAuth();
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const rosterEntries = useAppStore((s) => s.rosterEntries);
  const holidays = useAppStore((s) => s.holidays);
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [newEventOpen, setNewEventOpen] = useState(false);

  const eventIdParam = useSearchParams().get("event");
  useEffect(() => {
    if (!eventIdParam) return;
    const match = calendarEvents.find((e) => e.id === eventIdParam);
    if (match) setSelectedEvent(match);
  }, [eventIdParam, calendarEvents]);

  const selectedRosterEntry = selectedEvent?.rosterId ? rosterEntries.find((r) => r.id === selectedEvent.rosterId) : undefined;
  const isAssignedToSelected =
    !!user && !!selectedRosterEntry && (selectedRosterEntry.sundaySchoolUserIds.includes(user.id) || selectedRosterEntry.teenClubUserIds.includes(user.id));

  const eventsWithDates = useMemo(() => calendarEvents.map((e) => ({ ...e, dateObj: parseDate(e.date) })), [calendarEvents]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function eventsFor(day: Date) {
    return eventsWithDates.filter((e) => isSameDay(e.dateObj, day));
  }

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingAgenda = eventsWithDates.filter((e) => e.dateObj >= today).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  return (
    <div>
      <PageHeader
        eyebrow={t("calendar.eyebrow")}
        title={t("calendar.title")}
        description={t("calendar.description")}
        actions={
          view !== "holidays" && (
            <Button size="md" onClick={() => setNewEventOpen(true)}>
              <Plus size={15} /> {t("calendar.newEvent")}
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <Tabs
          tabs={[
            { id: "month", label: t("calendar.viewMonth") },
            { id: "week", label: t("calendar.viewWeek") },
            { id: "agenda", label: t("calendar.viewAgenda") },
            { id: "holidays", label: t("calendar.viewHolidays") },
          ]}
          active={view}
          onChange={setView}
        />
        {view !== "agenda" && view !== "holidays" && (
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

      {(view === "month" || view === "week") && (
        <Card className="p-3 sm:p-5" hover={false}>
          <div className="grid grid-cols-7 mb-2">
            {[
              t("calendar.dayAbbrevSun"),
              t("calendar.dayAbbrevMon"),
              t("calendar.dayAbbrevTue"),
              t("calendar.dayAbbrevWed"),
              t("calendar.dayAbbrevThu"),
              t("calendar.dayAbbrevFri"),
              t("calendar.dayAbbrevSat"),
            ].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {(view === "week" ? days.filter((d) => isSameDay(d, cursor) || true).slice(0, 7) : days).map((day, i) => {
              const dayEvents = eventsFor(day);
              const dayHolidays = holidaysOnDay(holidays, day);
              const vacation = dayHolidays.find((h) => h.type === "school_vacation");
              const nationalHolidays = dayHolidays.filter((h) => h.type === "national_holiday");
              const showVacationLabel = vacation && isVacationLabelDay(vacation, day, gridStart);
              const chips = [
                ...nationalHolidays.map((h) => ({ kind: "holiday" as const, holiday: h })),
                ...dayEvents.slice(0, 2).map((e) => ({ kind: "event" as const, event: e })),
              ];
              const visibleChips = chips.slice(0, 2);
              const hiddenCount = chips.length - visibleChips.length + Math.max(0, dayEvents.length - 2);
              const inMonth = isSameMonth(day, cursor);
              return (
                <motion.button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  whileHover={{ scale: 1.03 }}
                  style={vacation ? { boxShadow: `inset 0 -3px 0 0 ${HOLIDAY_COLORS.school_vacation}` } : undefined}
                  className={cn(
                    "aspect-square sm:aspect-[4/3] rounded-xl p-1.5 sm:p-2 text-left flex flex-col transition-colors border",
                    inMonth ? "border-[var(--border-soft)]" : "border-transparent opacity-40",
                    isToday(day) && "bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] border-[var(--color-gold)]"
                  )}
                >
                  <span className={cn("text-[11px] sm:text-xs font-semibold", isToday(day) && "text-[var(--color-gold-deep)]")}>{format(day, "d", { locale: dateFnsLocale })}</span>
                  <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                    {showVacationLabel && (
                      <span className="text-[8px] sm:text-[9px] font-semibold truncate flex items-center gap-0.5" style={{ color: HOLIDAY_COLORS.school_vacation }}>
                        <Palmtree size={8} className="shrink-0" /> {vacation.name}
                      </span>
                    )}
                    {visibleChips.map((c) =>
                      c.kind === "holiday" ? (
                        <span
                          key={c.holiday.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedHoliday(c.holiday);
                          }}
                          className={cn(
                            "text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded truncate text-white flex items-center gap-0.5",
                            c.holiday.provisional && "border border-dashed border-white/80"
                          )}
                          style={{ background: HOLIDAY_COLORS.national_holiday }}
                        >
                          <Flag size={8} className="shrink-0" /> {c.holiday.name}
                        </span>
                      ) : (
                        <span
                          key={c.event.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEvent(c.event);
                          }}
                          className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded truncate text-white"
                          style={{ background: c.event.color }}
                        >
                          {c.event.title}
                        </span>
                      )
                    )}
                    {hiddenCount > 0 && (
                      <span className="text-[9px] text-[var(--text-secondary)]">
                        +{hiddenCount} {t("calendar.more")}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>
      )}

      {view === "agenda" &&
        (upcomingAgenda.length === 0 ? (
          <EmptyState icon={Plus} title={t("calendar.noUpcomingEventsTitle")} description={t("calendar.noUpcomingEventsDescription")} />
        ) : (
          <div className="space-y-2.5">
            {upcomingAgenda.map((e) => (
              <Card key={e.id} className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setSelectedEvent(e)}>
                <div
                  className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, color: e.color }}
                >
                  <span className="text-[9px] font-bold leading-none">{format(e.dateObj, "MMM", { locale: dateFnsLocale })}</span>
                  <span className="text-base font-bold leading-none mt-0.5">{format(e.dateObj, "d", { locale: dateFnsLocale })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{e.title}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {e.time ?? t("calendar.allDay")}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {e.location}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full text-white shrink-0" style={{ background: e.color }}>
                  {enumLabels.eventType[language][e.type]}
                </span>
              </Card>
            ))}
          </div>
        ))}

      {view === "holidays" && <HolidaysManager />}

      {view !== "holidays" && (
        <div className="flex flex-wrap gap-3 mt-6">
          {eventTypes.map((et) => (
            <div key={et} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: eventTypeColors[et] }} />
              {enumLabels.eventType[language][et]}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: HOLIDAY_COLORS.school_vacation }} />
            {t("calendar.legendSchoolVacation")}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: HOLIDAY_COLORS.national_holiday }} />
            {t("calendar.legendNationalHoliday")}
          </div>
          {holidays.some((h) => h.provisional) && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
              <CircleAlert size={12} />
              {t("calendar.provisionalNote")}
            </div>
          )}
        </div>
      )}

      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} size="sm">
        {selectedEvent && (
          <div>
            <div className="h-24 flex items-end p-5" style={{ background: `linear-gradient(135deg, ${selectedEvent.color}, color-mix(in srgb, ${selectedEvent.color} 45%, black))` }}>
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{enumLabels.eventType[language][selectedEvent.type]}</span>
            </div>
            <div className="p-6">
              <h3 className="font-display font-semibold text-xl mb-3">{selectedEvent.title}</h3>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p className="flex items-center gap-2">
                  <Clock size={14} /> {parseDate(selectedEvent.date).toLocaleDateString(language === "nl" ? "nl-NL" : "en-US", { weekday: "long", month: "long", day: "numeric" })} {selectedEvent.time && `· ${selectedEvent.time}`}
                </p>
                {selectedEvent.location && (
                  <p className="flex items-center gap-2">
                    <MapPin size={14} /> {selectedEvent.location}
                  </p>
                )}
              </div>
              {selectedEvent.description && <p className="text-sm mt-4">{selectedEvent.description}</p>}
              {isAssignedToSelected && (
                <Badge tone="gold" className="mt-4">
                  {t("roster.youAreAssigned")}
                </Badge>
              )}
              {selectedEvent.rosterId && (
                <Link href={`/roster?highlight=${selectedEvent.rosterId}`} className="block mt-4">
                  <Button variant="outline" className="w-full">
                    <ClipboardList size={15} /> {t("roster.viewRoster")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? format(selectedDay, "EEEE, MMMM d", { locale: dateFnsLocale }) : ""} size="sm">
        {selectedDay && (
          <div className="space-y-2.5">
            {holidaysOnDay(holidays, selectedDay).map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: HOLIDAY_COLORS[h.type], background: `color-mix(in srgb, ${HOLIDAY_COLORS[h.type]} 8%, transparent)` }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: HOLIDAY_COLORS[h.type] }}>
                  {h.type === "school_vacation" ? <Palmtree size={14} /> : <Flag size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {h.name}
                    {h.provisional && (
                      <Badge tone="gold" className="!py-0.5 !px-1.5 !text-[9.5px] shrink-0">
                        <CircleAlert size={9} /> {t("calendar.provisionalBadge")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {enumLabels.holidayType[language][h.type]}
                    {h.startDate !== h.endDate && ` · ${formatDate(h.startDate, undefined, language)} – ${formatDate(h.endDate, undefined, language)}`}
                  </p>
                </div>
              </div>
            ))}
            {eventsFor(selectedDay).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-6">{t("calendar.noEventsOnThisDay")}</p>
            ) : (
              eventsFor(selectedDay).map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEvent(e);
                    setSelectedDay(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-soft)] hover:border-[var(--color-gold-light)] transition-colors text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{e.time ?? t("calendar.allDay")}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!selectedHoliday} onClose={() => setSelectedHoliday(null)} size="sm">
        {selectedHoliday && (
          <div>
            <div
              className="h-24 flex items-end p-5"
              style={{ background: `linear-gradient(135deg, ${HOLIDAY_COLORS[selectedHoliday.type]}, color-mix(in srgb, ${HOLIDAY_COLORS[selectedHoliday.type]} 45%, black))` }}
            >
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{enumLabels.holidayType[language][selectedHoliday.type]}</span>
            </div>
            <div className="p-6">
              <h3 className="font-display font-semibold text-xl mb-3 flex items-center gap-2">
                {selectedHoliday.name}
                {selectedHoliday.provisional && (
                  <Badge tone="gold">
                    <CircleAlert size={10} /> {t("calendar.provisionalBadge")}
                  </Badge>
                )}
              </h3>
              <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Clock size={14} />
                {selectedHoliday.startDate === selectedHoliday.endDate
                  ? formatDate(selectedHoliday.startDate, { weekday: "long" }, language)
                  : `${formatDate(selectedHoliday.startDate, undefined, language)} – ${formatDate(selectedHoliday.endDate, undefined, language)}`}
              </p>
              {selectedHoliday.provisional && <p className="text-[12.5px] text-[var(--text-secondary)] mt-3">{t("calendar.provisionalNote")}</p>}
            </div>
          </div>
        )}
      </Modal>

      <NewEventModal open={newEventOpen} onClose={() => setNewEventOpen(false)} />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent />
    </Suspense>
  );
}
