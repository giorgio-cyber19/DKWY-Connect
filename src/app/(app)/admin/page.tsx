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

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "teachers", label: "Teachers" },
  { id: "classes", label: "Classes" },
  { id: "moderation", label: "Moderation & Logs" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  if (!user) return null;

  if (user.role !== "admin") {
    return <EmptyState icon={ShieldOff} title="Administrator access required" description="This area is only available to Sunday School administrators." />;
  }

  return (
    <div>
      <PageHeader eyebrow="Ministry Management" title="Admin Panel" description="Manage teachers, classes, content, and view ministry-wide analytics." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6 flex-wrap" />
      {tab === "overview" && <AdminAnalytics />}
      {tab === "teachers" && <AdminTeachers />}
      {tab === "classes" && <AdminClasses />}
      {tab === "moderation" && <AdminModeration />}
    </div>
  );
}
