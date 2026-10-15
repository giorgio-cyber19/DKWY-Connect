"use client";

import { useEffect, useState } from "react";
import { ShieldOff, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminTeachers } from "@/components/admin/AdminTeachers";
import { AdminClasses } from "@/components/admin/AdminClasses";
import { AdminModeration } from "@/components/admin/AdminModeration";
import { AdminBackups } from "@/components/admin/AdminBackups";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

/** Warns on every Admin tab when the nightly backup is failing, stale, or can't reach Drive. */
function BackupAlert({ onOpen }: { onOpen: () => void }) {
  const { t } = useLanguage();
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    apiGet<{ status: { lastSuccessAt?: string; lastError?: string | null }; driveError: string | null; cronConfigured: boolean }>("/api/admin/backups")
      .then((d) => {
        const ageHours = d.status.lastSuccessAt ? (Date.now() - new Date(d.status.lastSuccessAt).getTime()) / 3_600_000 : Infinity;
        setProblem(!!d.status.lastError || !!d.driveError || (d.cronConfigured && ageHours > 48));
      })
      .catch(() => {});
  }, []);

  if (!problem) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-red-500/40 bg-red-500/5">
      <p className="text-[13.5px] font-semibold flex items-center gap-2">
        <TriangleAlert size={16} className="text-red-500" /> {t("admin.backupsAlertTitle")}
      </p>
      <Button size="sm" variant="outline" onClick={onOpen}>
        {t("admin.backupsAlertAction")}
      </Button>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: t("admin.tabOverview") },
    { id: "teachers", label: t("admin.tabTeachers") },
    { id: "classes", label: t("admin.tabClasses") },
    { id: "moderation", label: t("admin.tabModeration") },
    { id: "backups", label: t("admin.tabBackups") },
  ];

  if (!user) return null;

  if (user.role !== "admin") {
    return <EmptyState icon={ShieldOff} title={t("admin.pageAccessDeniedTitle")} description={t("admin.pageAccessDeniedDescription")} />;
  }

  return (
    <div>
      <PageHeader eyebrow={t("admin.pageEyebrow")} title={t("admin.pageTitle")} description={t("admin.pageDescription")} />
      {tab !== "backups" && <BackupAlert onOpen={() => setTab("backups")} />}
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6 flex-wrap" />
      {tab === "overview" && <AdminAnalytics />}
      {tab === "teachers" && <AdminTeachers />}
      {tab === "classes" && <AdminClasses />}
      {tab === "moderation" && <AdminModeration />}
      {tab === "backups" && <AdminBackups />}
    </div>
  );
}
