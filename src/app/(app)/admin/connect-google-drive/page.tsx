"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CloudOff, ExternalLink, HardDrive, ShieldOff, Database } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useAppStore } from "@/lib/store";
import { formatBytesLarge } from "@/lib/utils";

interface StorageInfo {
  limitBytes: number | null;
  usageBytes: number;
  usageInDriveBytes: number;
}

export default function ConnectGoogleDrivePage() {
  return (
    <Suspense fallback={null}>
      <ConnectGoogleDriveContent />
    </Suspense>
  );
}

function ConnectGoogleDriveContent() {
  const { user } = useAuth();
  const sessionToken = useAppStore((s) => s.sessionToken);
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "connected" | "not_connected">("loading");
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  async function checkStatus() {
    setStatus("loading");
    try {
      const res = await fetch("/api/drive/status");
      const data = await res.json();
      setStatus(data.connected ? "connected" : "not_connected");
      if (data.connected) loadStorage();
    } catch {
      setStatus("not_connected");
    }
  }

  async function loadStorage() {
    setStorageUnavailable(false);
    try {
      const token = useAppStore.getState().sessionToken;
      const res = await fetch("/api/drive/storage", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error("unavailable");
      setStorage(await res.json());
    } catch {
      setStorage(null);
      setStorageUnavailable(true);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  if (!user) return null;

  if (user.role !== "admin") {
    return <EmptyState icon={ShieldOff} title="Administrator access required" description="Only administrators can connect Google Drive." />;
  }

  const connectHref = sessionToken ? `/api/auth/google/start?token=${encodeURIComponent(sessionToken)}` : undefined;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        eyebrow="Admin · Integrations"
        title="Connect Google Drive"
        description="Authorize DWKY Connect to store uploaded files in your church's Google Drive. This is a one-time setup — every teacher's uploads will use this connection afterward."
      />

      {connectedParam === "1" && (
        <div className="mb-5 p-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_12%,transparent)] border border-[color-mix(in_srgb,var(--color-sage)_30%,transparent)] text-sm text-[var(--color-sage-deep)] font-medium">
          Google Drive connected successfully.
        </div>
      )}
      {errorParam && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-sm text-red-600 font-medium">{errorParam}</div>
      )}

      <Card className="p-6">
        {status === "loading" && <p className="text-sm text-[var(--text-secondary)]">Checking connection…</p>}

        {status === "connected" && (
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] flex items-center justify-center text-[var(--color-sage-deep)] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="font-semibold">Google Drive is connected</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Files upload into a shared Drive folder, organized into Children Portfolios, Lesson Plans, Photos, Encouragements, and
                Documents subfolders.
              </p>
              <Button variant="outline" size="sm" className="mt-4" disabled={!connectHref} onClick={() => connectHref && (window.location.href = connectHref)}>
                <HardDrive size={14} /> Reconnect a different account
              </Button>
            </div>
          </div>
        )}

        {status === "not_connected" && (
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] flex items-center justify-center text-[var(--color-gold-deep)] shrink-0">
              <CloudOff size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Not connected yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Click connect and sign in with the Google account whose Drive should store ministry files. You&apos;ll see Google&apos;s
                consent screen — approve access to Drive.
              </p>
              <Button className="mt-4" disabled={!connectHref} onClick={() => connectHref && (window.location.href = connectHref)}>
                <ExternalLink size={14} /> Connect Google Drive
              </Button>
              {!connectHref && <p className="text-[11px] text-[var(--text-secondary)] mt-2">Preparing your session…</p>}
            </div>
          </div>
        )}
      </Card>

      {status === "connected" && (
        <Card className="p-6 mt-5">
          <h3 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
            <Database size={16} /> Storage
          </h3>
          {storage ? (
            storage.limitBytes === null ? (
              <p className="text-sm text-[var(--text-secondary)]">Unlimited storage available (Google Workspace account).</p>
            ) : (
              <div>
                <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-gold)]"
                    style={{ width: `${Math.min(100, (storage.usageBytes / storage.limitBytes) * 100)}%` }}
                  />
                </div>
                <p className="text-sm mt-3">
                  <span className="font-semibold">{formatBytesLarge(storage.usageBytes)}</span> of {formatBytesLarge(storage.limitBytes)} used ·{" "}
                  <span className="font-semibold">{formatBytesLarge(Math.max(0, storage.limitBytes - storage.usageBytes))}</span> free
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                  This reflects your whole Google account&apos;s storage (Drive, Gmail, Photos) against its plan limit — not just DWKY
                  Connect&apos;s folder.
                </p>
              </div>
            )
          ) : storageUnavailable ? (
            <p className="text-sm text-[var(--text-secondary)]">Storage details aren&apos;t available right now.</p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Checking storage…</p>
          )}
        </Card>
      )}
    </div>
  );
}
