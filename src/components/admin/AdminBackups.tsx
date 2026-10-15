"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Download, RotateCcw, TriangleAlert, CircleCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { formatFileBytes } from "@/lib/format-bytes";
import { timeAgo, cn } from "@/lib/utils";

interface BackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  kind: "daily" | "prerestore";
}

interface BackupsResponse {
  status: { lastAttemptAt?: string; lastSuccessAt?: string; lastFileName?: string; lastSizeBytes?: number; lastKeyCount?: number; lastError?: string | null };
  backups: BackupFile[];
  driveError: string | null;
  cronConfigured: boolean;
  keySource: "dedicated" | "auth-secret";
  retention: { dailyDays: number; monthlyMonths: number };
}

interface Summary {
  createdAt: string;
  keyCount: number;
  categories: { category: string; keys: number }[];
  includesYou: boolean;
}

interface Plan {
  write: number;
  overwrite: number;
  remove: number;
}

type ScopeKind = "all" | "category" | "record";

const CATEGORY_LABELS: Record<string, { en: string; nl: string }> = {
  users: { en: "Accounts", nl: "Accounts" },
  children: { en: "Children", nl: "Kinderen" },
  classes: { en: "Classes", nl: "Klassen" },
  ageGroups: { en: "Age groups", nl: "Leeftijdsgroepen" },
  lessons: { en: "Lessons", nl: "Lessen" },
  posts: { en: "Updates posts", nl: "Berichten" },
  mediaItems: { en: "Media files", nl: "Mediabestanden" },
  documentItems: { en: "Documents", nl: "Documenten" },
  libraryFolders: { en: "Library folders", nl: "Bibliotheekmappen" },
  calendarEvents: { en: "Calendar events", nl: "Agenda-evenementen" },
  holidays: { en: "Holidays", nl: "Vakanties en feestdagen" },
  rosterEntries: { en: "Roster", nl: "Rooster" },
  notifications: { en: "Notifications", nl: "Meldingen" },
  auditLog: { en: "Activity log", nl: "Activiteitenlogboek" },
  aiConversation: { en: "AI conversations", nl: "AI-gesprekken" },
  aiConversations: { en: "AI conversation index", nl: "AI-gespreksindex" },
  "bible-highlights": { en: "Bible highlights", nl: "Bijbelmarkeringen" },
  "google-drive": { en: "Google Drive connection", nl: "Google Drive-koppeling" },
};

function formatDateTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === "nl" ? "nl-NL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function RestoreModal({ file, onClose, onDone }: { file: BackupFile | null; onClose: () => void; onDone: () => void }) {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scopeKind, setScopeKind] = useState<ScopeKind>("record");
  const [category, setCategory] = useState("");
  const [records, setRecords] = useState<{ key: string; label: string }[]>([]);
  const [recordKey, setRecordKey] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plan: Plan; safetyBackup: string } | null>(null);

  const fileId = file?.id;
  useEffect(() => {
    if (!fileId) return;
    apiGet<Summary>(`/api/admin/backups/${fileId}`)
      .then((s) => {
        setSummary(s);
        setCategory(s.categories.find((c) => c.category === "children")?.category ?? s.categories[0]?.category ?? "");
      })
      .catch((err) => setLoadError(translateApiError(err, language)));
  }, [fileId, language]);

  useEffect(() => {
    if (!fileId || scopeKind !== "record" || !category) return;
    let cancelled = false;
    apiGet<{ records: { key: string; label: string }[] }>(`/api/admin/backups/${fileId}?category=${encodeURIComponent(category)}`)
      .then((r) => {
        if (!cancelled) setRecords(r.records);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, scopeKind, category]);

  const label = (c: string) => CATEGORY_LABELS[c]?.[language] ?? c;

  function currentScope() {
    if (scopeKind === "all") return { type: "all" as const };
    if (scopeKind === "category") return { type: "category" as const, category };
    return { type: "record" as const, key: recordKey };
  }

  const scopeReady = scopeKind === "all" || (scopeKind === "category" && !!category) || (scopeKind === "record" && !!recordKey);

  function resetPreview() {
    setPlan(null);
    setError(null);
    setConfirmText("");
  }

  async function preview() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ plan: Plan }>(`/api/admin/backups/${file.id}`, { scope: currentScope(), dryRun: true });
      setPlan(res.plan);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ plan: Plan; safetyBackup: string }>(`/api/admin/backups/${file.id}`, {
        scope: currentScope(),
        confirm: scopeKind === "all" ? confirmText : undefined,
      });
      setResult(res);
      void useAppStore.getState().bootstrap();
      onDone();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setBusy(false);
    }
  }

  const shownRecords = records.filter((r) => r.label.toLowerCase().includes(search.toLowerCase())).slice(0, 60);
  const canRestore = !!plan && !busy && (scopeKind !== "all" || confirmText === "RESTORE");

  return (
    <Modal open={!!file} onClose={onClose} title={t("admin.backupsRestoreTitle")} size="md">
      {!file ? null : result ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-sage-deep)]">
            <CircleCheck size={16} /> {t("admin.backupsRestoreDone")}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {result.plan.write} {t("admin.backupsItemsRestored")}
            {result.plan.remove > 0 ? `, ${result.plan.remove} ${t("admin.backupsItemsRemoved")}` : ""}.
          </p>
          <p className="text-[12.5px] text-[var(--text-secondary)]">
            {t("admin.backupsSafetyNote")} <span className="font-mono">{result.safetyBackup}</span>
          </p>
          <Button className="w-full" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : !summary ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("admin.backupsReading")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            {t("admin.backupsMadeAt")} <span className="font-semibold text-[var(--text-primary)]">{formatDateTime(summary.createdAt, language)}</span>
          </p>

          <div className="space-y-2">
            {(
              [
                ["record", t("admin.backupsScopeRecord")],
                ["category", t("admin.backupsScopeCategory")],
                ["all", t("admin.backupsScopeAll")],
              ] as [ScopeKind, string][]
            ).map(([kind, text]) => (
              <label key={kind} className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="restore-scope"
                  checked={scopeKind === kind}
                  onChange={() => {
                    setScopeKind(kind);
                    resetPreview();
                  }}
                  className="mt-1 accent-[var(--color-gold)]"
                />
                <span>{text}</span>
              </label>
            ))}
          </div>

          {scopeKind !== "all" && (
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRecordKey("");
                resetPreview();
              }}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent"
            >
              {summary.categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {label(c.category)} ({c.keys})
                </option>
              ))}
            </select>
          )}

          {scopeKind === "record" && (
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.backupsSearchRecords")}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent mb-2"
              />
              <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border-soft)] divide-y divide-[var(--border-softer)]">
                {shownRecords.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--text-secondary)] p-3">{t("admin.backupsNoRecords")}</p>
                ) : (
                  shownRecords.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        setRecordKey(r.key);
                        resetPreview();
                      }}
                      className={cn(
                        "w-full text-left text-[13px] px-3 py-2 truncate hover:bg-black/[0.03]",
                        recordKey === r.key && "bg-[color-mix(in_srgb,var(--color-blue)_12%,transparent)] font-semibold"
                      )}
                    >
                      {r.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {plan && (
            <div className="p-3 rounded-xl border border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] text-[13px] space-y-1">
              <p className="font-semibold">{t("admin.backupsPlanHeading")}</p>
              <p>
                {plan.write} {t("admin.backupsPlanWrite")} ({plan.overwrite} {t("admin.backupsPlanOverwrite")})
                {plan.remove > 0 ? `, ${plan.remove} ${t("admin.backupsPlanRemove")}` : ""}.
              </p>
              {scopeKind === "all" && !summary.includesYou && (
                <p className="text-red-500 font-semibold flex items-start gap-1.5">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {t("admin.backupsNotInBackupWarning")}
                </p>
              )}
            </div>
          )}

          {plan && scopeKind === "all" && (
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.backupsTypeRestore")}</label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {!plan ? (
            <Button className="w-full" onClick={preview} loading={busy} disabled={!scopeReady || busy}>
              {t("admin.backupsPreview")}
            </Button>
          ) : (
            <Button className="w-full" onClick={restore} loading={busy} disabled={!canRestore}>
              <RotateCcw size={15} /> {t("admin.backupsRestoreAction")}
            </Button>
          )}
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("admin.backupsSafetyPromise")}</p>
        </div>
      )}
    </Modal>
  );
}

export function AdminBackups() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [restoreFile, setRestoreFile] = useState<BackupFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<BackupsResponse>("/api/admin/backups"));
    } catch (err) {
      setError(translateApiError(err, language));
    }
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    apiGet<BackupsResponse>("/api/admin/backups")
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(translateApiError(err, language));
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  async function runNow() {
    setRunning(true);
    setError(null);
    try {
      await apiPost("/api/admin/backups");
      await load();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setRunning(false);
    }
  }

  async function download(file: BackupFile) {
    setDownloadingId(file.id);
    setError(null);
    try {
      const token = useAppStore.getState().sessionToken;
      const res = await fetch(`/api/admin/backups/${file.id}?download=1`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Download failed.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.dwkybak$/, ".json");
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!data && !error) return <p className="text-sm text-[var(--text-secondary)]">{t("admin.backupsLoading")}</p>;

  const status = data?.status;
  const warnings: string[] = [];
  if (data?.driveError) warnings.push(data.driveError);
  if (status?.lastError) warnings.push(`${t("admin.backupsLastFailed")}: ${status.lastError}`);
  if (data && !data.cronConfigured) warnings.push(t("admin.backupsCronWarning"));
  if (data?.keySource === "auth-secret") warnings.push(t("admin.backupsKeyWarning"));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="font-display font-semibold text-lg flex items-center gap-2 mb-1">
          <Database size={17} /> {t("admin.backupsHeading")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("admin.backupsIntro")} {data ? `${t("admin.backupsRetentionPrefix")} ${data.retention.dailyDays} ${t("admin.backupsRetentionDays")} ${data.retention.monthlyMonths} ${t("admin.backupsRetentionMonths")}` : ""}
        </p>
      </div>

      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded-xl border border-red-500/40 bg-red-500/5 text-[13px]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-red-500" /> <span>{w}</span>
        </div>
      ))}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <Card hover={false} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{t("admin.backupsLastSuccess")}</p>
          <p className="text-sm font-semibold">
            {status?.lastSuccessAt ? `${formatDateTime(status.lastSuccessAt, language)} · ${timeAgo(status.lastSuccessAt, language)}` : t("admin.backupsNever")}
          </p>
          {status?.lastSizeBytes ? (
            <p className="text-[12px] text-[var(--text-secondary)]">
              {formatFileBytes(status.lastSizeBytes)} · {status.lastKeyCount} {t("admin.backupsRecords")}
            </p>
          ) : null}
        </div>
        <Button onClick={runNow} loading={running} disabled={running}>
          {t("admin.backupsRunNow")}
        </Button>
      </Card>

      <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5">
        <Lock size={12} /> {t("admin.backupsEncryptedNote")}
      </p>

      <div>
        <h4 className="font-display font-semibold text-[15px] mb-3">{t("admin.backupsListHeading")}</h4>
        {!data || data.backups.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("admin.backupsNone")}</p>
        ) : (
          <div className="space-y-2">
            {data.backups.map((b) => (
              <Card key={b.id} hover={false} className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold flex items-center gap-2 flex-wrap">
                    {b.createdTime ? formatDateTime(b.createdTime, language) : b.name}
                    <Badge tone={b.kind === "prerestore" ? "gold" : "neutral"}>
                      {b.kind === "prerestore" ? t("admin.backupsKindPrerestore") : t("admin.backupsKindDaily")}
                    </Badge>
                  </p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">
                    {formatFileBytes(b.size)} · <span className="font-mono">{b.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(b)} loading={downloadingId === b.id} disabled={downloadingId !== null}>
                    <Download size={13} /> {t("admin.backupsDownload")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRestoreFile(b)}>
                    <RotateCcw size={13} /> {t("admin.backupsRestore")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RestoreModal key={restoreFile?.id ?? "none"} file={restoreFile} onClose={() => setRestoreFile(null)} onDone={() => void load()} />
    </div>
  );
}
