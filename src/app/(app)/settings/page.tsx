"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Check, KeyRound, Camera, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { squareJpegDataUrl } from "@/lib/image-resize";
import { cn } from "@/lib/utils";
import { DriveStatusCard } from "@/components/settings/DriveStatusCard";
import { AccentColorPicker } from "@/components/settings/AccentColorPicker";

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
  const [accentColor, setAccentColor] = useState<string | null>(user?.accentColor ?? null);
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ lessons: true, portfolios: true, comments: true, events: true, prayer: true, admin: true });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  if (!user) return null;

  /** The photo is saved straight away (it isn't part of the "Save Changes" form below). */
  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    let photo: string;
    try {
      photo = await squareJpegDataUrl(file);
    } catch (err) {
      // the browser couldn't read it as a picture (or it is far too big)
      setPhotoError(err instanceof Error && err.message === "image_too_large" ? t("settings.photoTooLarge") : t("settings.photoError"));
      setPhotoBusy(false);
      return;
    }
    try {
      await useAppStore.getState().updateProfile({ photo });
    } catch (err) {
      setPhotoError(translateApiError(err, language));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await useAppStore.getState().updateProfile({ photo: null });
    } catch (err) {
      setPhotoError(translateApiError(err, language));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await useAppStore.getState().updateProfile({ name, bio, username: username.trim() || null, accentColor });
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
            <Avatar name={user.name} color={user.avatarColor} src={user.photo} size="xl" />
            <div className="min-w-0">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{user.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} loading={photoBusy} disabled={photoBusy}>
                  <Camera size={14} /> {user.photo ? t("settings.photoChange") : t("settings.photoUpload")}
                </Button>
                {user.photo && (
                  <Button size="sm" variant="ghost" onClick={removePhoto} disabled={photoBusy}>
                    <Trash2 size={14} /> {t("settings.photoRemove")}
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                changePhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] -mt-2 mb-4">{t("settings.photoHelp")}</p>
          {photoError && <p className="text-xs text-red-500 font-medium -mt-2 mb-4">{photoError}</p>}
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
          <h3 className="font-display font-semibold text-lg mb-1">{t("settings.accentColorTitle")}</h3>
          <p className="text-[12.5px] text-[var(--text-secondary)] mb-4">{t("settings.accentColorDescription")}</p>
          <AccentColorPicker value={accentColor} onChange={setAccentColor} />
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{t("settings.notificationsTitle")}</h3>
          <div className="space-y-3.5">
            {notificationOptions.map((opt) => (
              <label key={opt.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">{opt.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifs[opt.key]}
                  aria-label={opt.label}
                  onClick={() => setNotifs((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  className={cn(
                    "w-10 h-6 rounded-full relative transition-colors focus-ring",
                    notifs[opt.key] ? "bg-[var(--color-gold)]" : "bg-[color-mix(in_srgb,var(--text-secondary)_30%,transparent)]"
                  )}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: notifs[opt.key] ? "translateX(16px)" : "translateX(0)" }}
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
