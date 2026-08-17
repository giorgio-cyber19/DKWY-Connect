"use client";

import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { parseDate, cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";
import { translateApiError } from "@/lib/i18n/errors";
import type { CalendarEvent } from "@/lib/types";

const eventTypes: CalendarEvent["type"][] = ["Sunday Lesson", "Teacher Meeting", "Children Event", "Holiday Program", "VBS", "Birthday", "Parent Meeting"];

const eventTypeColors: Record<CalendarEvent["type"], string> = {
  "Sunday Lesson": "var(--color-gold)",
  "Teacher Meeting": "var(--color-blue)",
  "Children Event": "var(--color-blue-deep)",
  "Holiday Program": "var(--color-sage-deep)",
  VBS: "var(--color-gold-deep)",
  Birthday: "var(--color-sage)",
  "Parent Meeting": "var(--color-gold-deep)",
};

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
            {eventTypes.map((et) => (
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

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const dateFnsLocale = language === "nl" ? nlLocale : undefined;
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [newEventOpen, setNewEventOpen] = useState(false);

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
          <Button size="md" onClick={() => setNewEventOpen(true)}>
            <Plus size={15} /> {t("calendar.newEvent")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <Tabs
          tabs={[
            { id: "month", label: t("calendar.viewMonth") },
            { id: "week", label: t("calendar.viewWeek") },
            { id: "agenda", label: t("calendar.viewAgenda") },
          ]}
          active={view}
          onChange={setView}
        />
        {view !== "agenda" && (
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
              const inMonth = isSameMonth(day, cursor);
              return (
                <motion.button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  whileHover={{ scale: 1.03 }}
                  className={cn(
                    "aspect-square sm:aspect-[4/3] rounded-xl p-1.5 sm:p-2 text-left flex flex-col transition-colors border",
                    inMonth ? "border-[var(--border-soft)]" : "border-transparent opacity-40",
                    isToday(day) && "bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] border-[var(--color-gold)]"
                  )}
                >
                  <span className={cn("text-[11px] sm:text-xs font-semibold", isToday(day) && "text-[var(--color-gold-deep)]")}>{format(day, "d", { locale: dateFnsLocale })}</span>
                  <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedEvent(e);
                        }}
                        className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded truncate text-white"
                        style={{ background: e.color }}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-[var(--text-secondary)]">
                        +{dayEvents.length - 2} {t("calendar.more")}
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
                <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white" style={{ background: e.color }}>
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

      <div className="flex flex-wrap gap-3 mt-6">
        {eventTypes.map((et) => (
          <div key={et} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: eventTypeColors[et] }} />
            {enumLabels.eventType[language][et]}
          </div>
        ))}
      </div>

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
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? format(selectedDay, "EEEE, MMMM d", { locale: dateFnsLocale }) : ""} size="sm">
        {selectedDay && (
          <div className="space-y-2.5">
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

      <NewEventModal open={newEventOpen} onClose={() => setNewEventOpen(false)} />
    </div>
  );
}
