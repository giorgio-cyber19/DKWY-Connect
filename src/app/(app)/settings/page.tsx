"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Moon, Check, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { cn } from "@/lib/utils";
import { DriveStatusCard } from "@/components/settings/DriveStatusCard";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, language } = useLanguage();

  const notificationOptions = [
    { key: "lessons", label: t("settings.notifLessons") },
    { key: "portfolios", label: t("settings.notifPortfolios") },
    { key: "comments", label: t("settings.notifComments") },
    { key: "events", label: t("settings.notifEvents") },
    { key: "prayer", label: t("settings.notifPrayer") },
    { key: "admin", label: t("settings.notifAdmin") },
  ];
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ lessons: true, portfolios: true, comments: true, events: true, prayer: true, admin: true });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await useAppStore.getState().updateProfile({ name, bio, username: username.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.pageTitle")} description={t("settings.pageDescription")} />

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{t("settings.profileTitle")}</h3>
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={user.name} color={user.avatarColor} size="xl" />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{user.title}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("settings.fullName")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.email")}</label>
              <input
                value={user.email}
                disabled
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-black/[0.03] text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("settings.usernameLabel")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.usernamePlaceholder")}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                {t("settings.usernameHelp")}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("settings.aboutLabel")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{t("settings.appearanceTitle")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => theme === "dark" && toggleTheme()}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
                theme === "light" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--border-soft)]"
              )}
            >
              <Sun size={20} />
              <span className="text-sm font-semibold">{t("settings.light")}</span>
            </button>
            <button
              onClick={() => theme === "light" && toggleTheme()}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
                theme === "dark" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--border-soft)]"
              )}
            >
              <Moon size={20} />
              <span className="text-sm font-semibold">{t("settings.dark")}</span>
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{t("settings.notificationsTitle")}</h3>
          <div className="space-y-3.5">
            {notificationOptions.map((opt) => (
              <label key={opt.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">{opt.label}</span>
                <button
                  type="button"
                  onClick={() => setNotifs((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  className={cn("w-10 h-6 rounded-full relative transition-colors", notifs[opt.key] ? "bg-[var(--color-gold)]" : "bg-black/15")}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      notifs[opt.key] ? "translate-x-[18px]" : "translate-x-0.5"
                    )}
                  />
                </button>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{t("settings.securityTitle")}</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("common.password")}</p>
              <p className="text-[12.5px] text-[var(--text-secondary)]">{t("settings.passwordDescription")}</p>
            </div>
            <Link href="/change-password">
              <Button variant="outline" size="sm">
                <KeyRound size={14} /> {t("settings.changePassword")}
              </Button>
            </Link>
          </div>
        </Card>

        {user.role === "admin" && <DriveStatusCard />}

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving} disabled={saving}>
            {saved ? <Check size={15} /> : null} {saved ? t("common.saved") : t("common.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
