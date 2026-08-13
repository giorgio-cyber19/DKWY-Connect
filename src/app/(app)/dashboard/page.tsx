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
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LessonCard } from "@/components/lessons/LessonCard";
import { PostCard } from "@/components/updates/PostCard";
import { getUser, getClass, useAppStore } from "@/lib/store";
import { parseDate } from "@/lib/utils";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
  const children = useAppStore((s) => s.children);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const posts = useAppStore((s) => s.posts);
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const prayerEntries = useAppStore((s) => s.prayerEntries);
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
  const activePrayers = prayerEntries.slice(0, 2);
  const recentPortfolios = myChildren.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[24px] p-7 sm:p-9 card-shadow text-white"
        style={{ background: "linear-gradient(120deg, var(--color-gold-deep), var(--color-gold) 55%, var(--color-blue-deep))" }}
      >
        <Sparkles size={120} className="absolute -right-6 -top-6 opacity-15" />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80 mb-2">{getGreeting()}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-2">Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-white/85 max-w-xl text-sm sm:text-[15px] leading-relaxed">
          Next Sunday is <strong>{nextSunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
          {upcomingLesson ? (
            <>
              {" "}
              — you're teaching <strong>&ldquo;{upcomingLesson.title}&rdquo;</strong> for {myClass?.name ?? "your class"}.
            </>
          ) : (
            <> — get your class ready for a joyful morning ahead.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          {upcomingLesson && (
            <Link href={`/lessons/${upcomingLesson.id}`}>
              <Button variant="primary" size="sm" className="!bg-white !text-[var(--color-gold-deep)] !shadow-none border-0">
                View lesson plan <ArrowRight size={14} />
              </Button>
            </Link>
          )}
          <Link href="/my-class">
            <Button variant="outline" size="sm" className="!border-white/40 !text-white hover:!bg-white/10">
              <GraduationCap size={14} /> My class
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Metric cards */}
      <StaggerGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Children in your care" value={myChildren.length} icon={Users} color="var(--color-gold-deep)" />
        <MetricCard label="Published lessons" value={lessonPlans.filter((l) => l.status === "published").length} icon={BookOpen} color="var(--color-blue-deep)" />
        <MetricCard label="Upcoming events" value={upcomingEvents.length} icon={CalendarDays} color="var(--color-sage-deep)" />
        <MetricCard label="Active prayer requests" value={prayerEntries.length} icon={HeartHandshake} color="var(--color-gold-deep)" />
      </StaggerGrid>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Recent Teacher Updates</h2>
              <Link href="/updates" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No updates yet — be the first to post.</p>
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
              <h2 className="font-display text-xl font-semibold">Latest Lesson Plans</h2>
              <Link href="/lessons" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {latestLessons.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No published lessons yet.</p>
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
              <h3 className="font-display font-semibold">Upcoming Calendar</h3>
              <Link href="/calendar" className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                Full calendar
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">Nothing on the calendar yet.</p>
            ) : (
              <StaggerGrid className="space-y-3">
                {upcomingEvents.map((e) => (
                  <StaggerItem key={e.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white" style={{ background: e.color }}>
                      <span className="text-[9px] font-bold leading-none">{parseDate(e.date).toLocaleDateString("en-US", { month: "short" })}</span>
                      <span className="text-[13px] font-bold leading-none">{parseDate(e.date).getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{e.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{e.time ?? "All day"} {e.location && `· ${e.location}`}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGrid>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Prayer & Encouragement</h3>
              <Link href="/prayer" className="text-[11px] font-semibold text-[var(--color-blue-deep)]">
                See all
              </Link>
            </div>
            {activePrayers.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">No prayer requests yet.</p>
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
                          <Badge tone="gold" className="!py-0.5 !px-1.5 !text-[9.5px]">{p.type}</Badge>
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
            <h3 className="font-display font-semibold mb-4">Class Summary</h3>
            {classes.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">No classes set up yet.</p>
            ) : (
              <div className="space-y-3">
                {classes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-[13px] flex-1">{c.name}</span>
                    <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{c.childCount} kids</span>
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
                <p className="text-sm font-semibold">Quick Upload</p>
                <p className="text-[11.5px] text-[var(--text-secondary)]">Add photos, artwork, or documents</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recently updated portfolios */}
      {recentPortfolios.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Recently Updated Portfolios</h2>
            <Link href="/children" className="text-xs font-semibold text-[var(--color-blue-deep)] flex items-center gap-1 hover:gap-1.5 transition-all">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <StaggerGrid className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {recentPortfolios.map((c) => (
              <StaggerItem key={c.id} className="shrink-0 w-40">
                <Link href={`/children/${c.id}`}>
                  <Card className="p-4 flex flex-col items-center text-center">
                    <Avatar name={c.name} color={c.photoColor} size="lg" />
                    <p className="text-[13px] font-semibold mt-2.5 truncate w-full">{c.name}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Age {c.age}</p>
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
