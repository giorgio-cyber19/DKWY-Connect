"use client";

import { useState } from "react";
import { ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminTeachers } from "@/components/admin/AdminTeachers";
import { AdminClasses } from "@/components/admin/AdminClasses";
import { AdminModeration } from "@/components/admin/AdminModeration";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: t("admin.tabOverview") },
    { id: "teachers", label: t("admin.tabTeachers") },
    { id: "classes", label: t("admin.tabClasses") },
    { id: "moderation", label: t("admin.tabModeration") },
  ];

  if (!user) return null;

  if (user.role !== "admin") {
    return <EmptyState icon={ShieldOff} title={t("admin.pageAccessDeniedTitle")} description={t("admin.pageAccessDeniedDescription")} />;
  }

  return (
    <div>
      <PageHeader eyebrow={t("admin.pageEyebrow")} title={t("admin.pageTitle")} description={t("admin.pageDescription")} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6 flex-wrap" />
      {tab === "overview" && <AdminAnalytics />}
      {tab === "teachers" && <AdminTeachers />}
      {tab === "classes" && <AdminClasses />}
      {tab === "moderation" && <AdminModeration />}
    </div>
  );
}
