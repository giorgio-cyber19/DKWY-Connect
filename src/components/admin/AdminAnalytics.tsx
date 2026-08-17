"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Users, BookOpen, ImageIcon, Baby } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/lib/store";
import { parseDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

const categoricalLight = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const categoricalDark = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];

function TooltipCard({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-solid rounded-xl px-3 py-2 text-xs card-shadow">
      <p className="font-semibold">{label}</p>
      <p className="text-[var(--text-secondary)]">{payload[0].value} {payload[0].name}</p>
    </div>
  );
}

export function AdminAnalytics() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const classes = useAppStore((s) => s.classes);
  const users = useAppStore((s) => s.users);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const mediaItems = useAppStore((s) => s.mediaItems);
  const posts = useAppStore((s) => s.posts);
  const children = useAppStore((s) => s.children);

  const magnitudeHue = theme === "dark" ? "#3987e5" : "#2a78d6";
  const categorical = theme === "dark" ? categoricalDark : categoricalLight;
  const gridColor = theme === "dark" ? "#3a362f" : "#e7e2d6";
  const textColor = theme === "dark" ? "#b7ae9d" : "#8a8272";

  const classData = classes.map((c) => ({ name: c.name, count: c.childCount }));

  const lessonActivity = useMemo(() => {
    const months: { key: string; month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString(language === "nl" ? "nl-NL" : "en-US", { month: "short" }), count: 0 });
    }
    lessonPlans.forEach((l) => {
      if (l.status !== "published") return;
      const d = parseDate(l.updatedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count += 1;
    });
    return months;
  }, [lessonPlans, language]);

  const engagement = users
    .filter((u) => u.role === "teacher")
    .map((u) => ({
      user: u,
      lessons: lessonPlans.filter((l) => l.authorId === u.id).length,
      posts: posts.filter((p) => p.authorId === u.id).length,
    }))
    .map((e) => ({ ...e, score: e.lessons * 3 + e.posts }))
    .sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...engagement.map((e) => e.score), 1);

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <Card className="p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)]">
              <Users size={19} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">{users.filter((u) => u.role === "teacher" && u.status === "active").length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("admin.analyticsStatActiveTeachers")}</p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-blue)_16%,transparent)] flex items-center justify-center text-[var(--color-blue-deep)]">
              <BookOpen size={19} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">{lessonPlans.length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("admin.analyticsStatTotalLessonPlans")}</p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] flex items-center justify-center text-[var(--color-sage-deep)]">
              <ImageIcon size={19} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">{mediaItems.length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("admin.analyticsStatMediaFilesUploaded")}</p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)]">
              <Baby size={19} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">{children.length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("admin.analyticsStatChildrenInPortfolios")}</p>
            </div>
          </Card>
        </StaggerItem>
      </StaggerGrid>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 pb-2">
          <h3 className="font-display font-semibold mb-1">{t("admin.analyticsLessonActivityTitle")}</h3>
          <p className="text-[12px] text-[var(--text-secondary)] mb-4">{t("admin.analyticsLessonActivitySubtitle")}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lessonActivity} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<TooltipCard />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="count" name={t("admin.analyticsChartLessonsLabel")} fill={magnitudeHue} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 pb-2">
          <h3 className="font-display font-semibold mb-1">{t("admin.analyticsChildrenPerClassTitle")}</h3>
          <p className="text-[12px] text-[var(--text-secondary)] mb-4">{t("admin.analyticsChildrenPerClassSubtitle")}</p>
          {classData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[var(--text-secondary)]">{t("admin.analyticsNoClassesYet")}</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />
                  <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<TooltipCard />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" name={t("admin.analyticsChartChildrenLabel")} radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {classData.map((_, i) => (
                      <Cell key={i} fill={categorical[i % categorical.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-semibold mb-1">{t("admin.analyticsTeacherEngagementTitle")}</h3>
        <p className="text-[12px] text-[var(--text-secondary)] mb-4">{t("admin.analyticsTeacherEngagementSubtitle")}</p>
        {engagement.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("admin.analyticsNoTeachersYet")}</p>
        ) : (
          <div className="space-y-3.5">
            {engagement.map((e) => (
              <div key={e.user.id} className="flex items-center gap-3">
                <span className="text-[12px] font-semibold w-28 shrink-0 truncate">{e.user.name}</span>
                <div className="flex-1 h-2 rounded-full bg-black/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(e.score / maxScore) * 100}%`, background: magnitudeHue }} />
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] w-24 shrink-0 text-right">
                  {e.lessons} {t("admin.analyticsChartLessonsLabel")} · {e.posts} {t("admin.analyticsEngagementPostsSuffix")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
