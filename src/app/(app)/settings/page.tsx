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
import { cn } from "@/lib/utils";
import { DriveStatusCard } from "@/components/settings/DriveStatusCard";

const notificationOptions = [
  { key: "lessons", label: "New lesson plans published" },
  { key: "portfolios", label: "Child portfolio updates" },
  { key: "comments", label: "Comments on my posts" },
  { key: "events", label: "New calendar events" },
  { key: "prayer", label: "New prayer requests" },
  { key: "admin", label: "Admin announcements" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      setError(err instanceof Error ? err.message : "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader eyebrow="Your Account" title="Settings" description="Manage your profile, appearance, and notification preferences." />

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Profile</h3>
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={user.name} color={user.avatarColor} size="xl" />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{user.title}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-black/[0.03] text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Username (optional)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. gracem"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                Lets you sign in with a username instead of your email. 3-24 characters: letters, numbers, dots, underscores, or hyphens.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">About</label>
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
          <h3 className="font-display font-semibold text-lg mb-4">Appearance</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => theme === "dark" && toggleTheme()}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
                theme === "light" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--border-soft)]"
              )}
            >
              <Sun size={20} />
              <span className="text-sm font-semibold">Light</span>
            </button>
            <button
              onClick={() => theme === "light" && toggleTheme()}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
                theme === "dark" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--border-soft)]"
              )}
            >
              <Moon size={20} />
              <span className="text-sm font-semibold">Dark</span>
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Notifications</h3>
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
          <h3 className="font-display font-semibold text-lg mb-4">Security</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Password</p>
              <p className="text-[12.5px] text-[var(--text-secondary)]">Change the password you use to sign in.</p>
            </div>
            <Link href="/change-password">
              <Button variant="outline" size="sm">
                <KeyRound size={14} /> Change Password
              </Button>
            </Link>
          </div>
        </Card>

        {user.role === "admin" && <DriveStatusCard />}

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving} disabled={saving}>
            {saved ? <Check size={15} /> : null} {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
