"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { RosterEntry, User } from "@/lib/types";

export function resolveUserDisplay(id: string, users: User[]) {
  const user = users.find((u) => u.id === id);
  if (!user) return { name: "roster.formerMember" as const, avatarColor: "var(--color-ink-soft)", inactive: true, missing: true };
  return { name: user.name, avatarColor: user.avatarColor, inactive: user.status === "disabled", missing: false };
}

function PeopleChips({ ids, users }: { ids: string[]; users: User[] }) {
  const { t } = useLanguage();
  if (ids.length === 0) return <span className="text-[var(--text-secondary)]">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const display = resolveUserDisplay(id, users);
        const name = display.missing ? t("roster.formerMember") : display.name;
        return (
          <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]">
            <Avatar name={name} color={display.avatarColor} size="xs" />
            <span className="text-[11.5px] font-medium">{name}</span>
            {display.inactive && <Badge tone="danger">{t("roster.disabledTag")}</Badge>}
          </span>
        );
      })}
    </div>
  );
}

export function RosterListRow({
  entry,
  users,
  density = "full",
}: {
  entry: RosterEntry;
  users: User[];
  density?: "compact" | "full";
}) {
  const { t, language } = useLanguage();

  return (
    <Link
      href={`/roster?highlight=${entry.id}`}
      className="block rounded-2xl border border-[var(--border-soft)] hover:border-[var(--color-gold-light)] transition-colors p-4 sm:p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr_1fr_1.4fr] gap-3 sm:gap-4 items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] sm:hidden">{t("common.date")}</p>
          <p className="font-display font-semibold text-sm">{formatDate(entry.date, { weekday: "short" }, language)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">{t("roster.sundaySchool")}</p>
          <PeopleChips ids={entry.sundaySchoolUserIds} users={users} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">{t("roster.teenClub")}</p>
          <PeopleChips ids={entry.teenClubUserIds} users={users} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">{t("roster.theme")}</p>
          <p className="text-sm font-medium truncate">{entry.theme || "—"}</p>
          {entry.serviceType && <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5">{entry.serviceType}</p>}
        </div>
      </div>

      {density === "full" && (entry.preacher || entry.liturgy || entry.musicalAccompaniment || entry.notes) && (
        <div className="mt-3 pt-3 border-t border-[var(--border-softer)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11.5px] text-[var(--text-secondary)]">
          {entry.preacher && (
            <p>
              <span className="font-semibold text-[var(--text-primary)]">{t("roster.preacher")}: </span>
              {entry.preacher}
            </p>
          )}
          {entry.liturgy && (
            <p>
              <span className="font-semibold text-[var(--text-primary)]">{t("roster.liturgy")}: </span>
              {entry.liturgy}
            </p>
          )}
          {entry.musicalAccompaniment && (
            <p>
              <span className="font-semibold text-[var(--text-primary)]">{t("roster.musicalAccompaniment")}: </span>
              {entry.musicalAccompaniment}
            </p>
          )}
          {entry.notes && (
            <p className="sm:col-span-3">
              <span className="font-semibold text-[var(--text-primary)]">{t("roster.notes")}: </span>
              {entry.notes}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
