"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  CalendarDays,
  HeartHandshake,
  ArrowRight,
  UploadCloud,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { MotifCluster } from "@/components/dashboard/MotifCluster";
import { LessonCard } from "@/components/lessons/LessonCard";
import { PostCard, typeTone } from "@/components/updates/PostCard";
import { getUser, getClass, useAppStore } from "@/lib/store";
import { parseDate, formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { enumLabels } from "@/lib/i18n/enum-labels";

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNextSunday() {
  const now = new Date();
  const day = now.getDay();
  const diff = (7 - day) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const children = useAppStore((s) => s.children);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const posts = useAppStore((s) => s.posts);
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const classes = useAppStore((s) => s.classes);

  if (!user) return null;

  const nextSunday = getNextSunday();
  const myClass = user.classId ? getClass(user.classId) : undefined;
  const myChildren = user.role === "teacher" ? children.filter((c) => c.classId === user.classId) : children;
  const upcomingLesson = lessonPlans.find((l) => l.ageGroupId === myClass?.ageGroupId && l.status === "published");

  const recentUpdates = posts.slice(0, 2);
  const latestLessons = lessonPlans.filter((l) => l.status === "published").slice(0, 3);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const upcomingEvents = calendarEvents
    .filter((e) => parseDate(e.date) >= todayMidnight)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, 4);
  const prayerPosts = posts.filter((p) => p.type === "Prayer");
  const activePrayers = prayerPosts.slice(0, 2);
  const recentPortfolios = myChildren.slice(0, 6);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="chapel-hero p-5 sm:p-9"
      >
        <MotifCluster
          className="w-[150px] sm:w-[260px] text-white/60 pointer-events-none"
          style={{ position: "absolute", top: "-16px", right: "-16px" }}
        />
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 lg:gap-8 items-start">
          {/* Left: greeting + lesson line + actions */}
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-[var(--color-gold)] text-[#151a2d] mb-3 sm:mb-4">
              {t("dashboard.thisSundayPill")}
              {myClass?.room && <> · {t("dashboard.roomPrefix")} {myClass.room}</>}
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80 mb-2">{t(`dashboard.${getGreetingKey()}`)}</p>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold mb-2">{t("dashboard.welcomeBackPrefix")} {user.name.split(" ")[0]} 👋</h1>
            <p className="text-white/85 max-w-xl text-sm sm:text-[15px] leading-relaxed">
              {t("dashboard.nextSundayPrefix")} <strong>{formatDate(toIsoDate(nextSunday), undefined, language)}</strong>
              {upcomingLesson ? (
                <>
                  {" "}
                  {t("dashboard.teachingIntro")} <strong>&ldquo;{upcomingLesson.title}&rdquo;</strong> {t("dashboard.teachingForClass")} {myClass?.name ?? t("dashboard.yourClassFallback")}.
                </>
              ) : (
                <> {t("dashboard.defaultBanner")}</>
              )}
            </p>
            <div className="flex flex-wrap gap-2.5 mt-4 sm:mt-5">
              {upcomingLesson && (
                <Link href={`/lessons/${upcomingLesson.id}`}>
                  <Button variant="primary" size="sm" className="!bg-white !text-[var(--color-blue-deep)] !shadow-none">
                    {t("dashboard.viewLessonPlan")} <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
              <Link href="/my-class">
                <Button variant="outline" size="sm" className="!border-white/40 !text-white hover:!bg-white/10">
                  <GraduationCap size={14} /> {t("dashboard.myClassLabel")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: memory verse + 2x2 metrics */}
          <div className="space-y-3 sm:space-y-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.12]">
              <p className="verse text-white text-[13px] sm:text-[15px]">
                {upcomingLesson?.memoryVerse ? <>&ldquo;{upcomingLesson.memoryVerse}&rdquo;</> : t("dashboard.noMemoryVerseYet")}
              </p>
            </div>
            <StaggerGrid className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <StaggerItem className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.12]">
                <Users size={16} className="text-white/80 mb-1.5 sm:mb-2" />
                <p className="font-display text-lg sm:text-xl font-semibold leading-none">{myChildren.length}</p>
                <p className="text-[10.5px] sm:text-[11px] text-white/75 mt-1">{t("dashboard.childrenInYourCare")}</p>
              </StaggerItem>
              <StaggerItem className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.12]">
                <BookOpen size={16} className="text-white/80 mb-1.5 sm:mb-2" />
                <p className="font-display text-lg sm:text-xl font-semibold leading-none">{lessonPlans.filter((l) => l.status === "published").length}</p>
                <p className="text-[10.5px] sm:text-[11px] text-white/75 mt-1">{t("dashboard.publishedLessons")}</p>
              </StaggerItem>
              <StaggerItem className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.12]">
                <CalendarDays size={16} className="text-white/80 mb-1.5 sm:mb-2" />
                <p className="font-display text-lg sm:text-xl font-semibold leading-none">{upcomingEvents.length}</p>
                <p className="text-[10.5px] sm:text-[11px] text-white/75 mt-1">{t("dashboard.upcomingEventsLabel")}</p>
              </StaggerItem>
              <StaggerItem className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.12]">
                <HeartHandshake size={16} className="text-white/80 mb-1.5 sm:mb-2" />
                <p className="font-display text-lg sm:text-xl font-semibold leading-none">{prayerPosts.length}</p>
                <p className="text-[10.5px] sm:text-[11px] text-white/75 mt-1">{t("dashboard.activePrayerRequests")}</p>
              </StaggerItem>
            </StaggerGrid>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">{t("dashboard.recentTeacherUpdates")}</h2>
              <Link href="/updates" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
                {t("common.viewAll")} <ArrowRight size={13} />
              </Link>
            </div>
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.noUpdatesYet")}</p>
            ) : (
              <StaggerGrid className="space-y-4">
                {recentUpdates.map((p) => (
                  <PostCard key={p.id} post={p} compact />
                ))}
              </StaggerGrid>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">{t("dashboard.latestLessonPlans")}</h2>
              <Link href="/lessons" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
                {t("common.viewAll")} <ArrowRight size={13} />
              </Link>
            </div>
            {latestLessons.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.noPublishedLessons")}</p>
            ) : (
              <StaggerGrid className="grid sm:grid-cols-2 gap-4">
                {latestLessons.map((l) => (
                  <LessonCard key={l.id} lesson={l} />
                ))}
              </StaggerGrid>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">{t("dashboard.upcomingCalendar")}</h3>
              <Link href="/calendar" className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                {t("dashboard.fullCalendar")}
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">{t("dashboard.nothingOnCalendar")}</p>
            ) : (
              <StaggerGrid className="space-y-3">
                {upcomingEvents.map((e) => (
                  <StaggerItem key={e.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, color: e.color }}
                    >
                      <span className="text-[9px] font-bold leading-none">{formatDate(e.date, { month: "short", day: undefined, year: undefined }, language)}</span>
                      <span className="text-[13px] font-bold leading-none">{parseDate(e.date).getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{e.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{e.time ?? t("dashboard.allDay")} {e.location && `· ${e.location}`}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGrid>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">{t("dashboard.prayerAndEncouragement")}</h3>
              <Link href="/updates" className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                {t("common.seeAll")}
              </Link>
            </div>
            {activePrayers.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">{t("dashboard.noPrayerRequestsYet")}</p>
            ) : (
              <StaggerGrid className="space-y-4">
                {activePrayers.map((p) => {
                  const author = getUser(p.authorId);
                  return (
                    <StaggerItem key={p.id} className="flex gap-3">
                      <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[12.5px] font-semibold">{author?.name}</p>
                          <Badge tone={typeTone[p.type]} className="!py-0.5 !px-1.5 !text-[9.5px]">{enumLabels.postType[language][p.type]}</Badge>
                        </div>
                        <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-2">{p.content}</p>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerGrid>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-4">{t("dashboard.classSummary")}</h3>
            {classes.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">{t("dashboard.noClassesSetUp")}</p>
            ) : (
              <div className="space-y-3">
                {classes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-[13px] flex-1">{c.name}</span>
                    <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{c.childCount} {t("dashboard.kidsSuffix")}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Link href="/media">
            <Card className="p-5 flex items-center gap-4 border-dashed !border-2 !border-[var(--color-gold-light)]" glass={false}>
              <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)] shrink-0">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("dashboard.quickUpload")}</p>
                <p className="text-[11.5px] text-[var(--text-secondary)]">{t("dashboard.quickUploadDesc")}</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recently updated portfolios */}
      {recentPortfolios.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">{t("dashboard.recentlyUpdatedPortfolios")}</h2>
            <Link href="/children" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
              {t("common.viewAll")} <ArrowRight size={13} />
            </Link>
          </div>
          <StaggerGrid className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {recentPortfolios.map((c) => (
              <StaggerItem key={c.id} className="shrink-0 w-40">
                <Link href={`/children/${c.id}`}>
                  <Card className="p-4 flex flex-col items-center text-center">
                    <Avatar name={c.name} color={c.photoColor} size="lg" />
                    <p className="text-[13px] font-semibold mt-2.5 truncate w-full">{c.name}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t("dashboard.agePrefix")} {c.age}</p>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </section>
      )}
    </div>
  );
}
