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
import { useLanguage } from "@/lib/language-context";

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
  const { t } = useLanguage();
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
    return <EmptyState icon={ShieldOff} title={t("admin.pageAccessDeniedTitle")} description={t("admin.driveAccessDeniedDescription")} />;
  }

  const connectHref = sessionToken ? `/api/auth/google/start?token=${encodeURIComponent(sessionToken)}` : undefined;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        eyebrow={t("admin.driveEyebrow")}
        title={t("admin.driveTitle")}
        description={t("admin.driveDescription")}
      />

      {connectedParam === "1" && (
        <div className="mb-5 p-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_12%,transparent)] border border-[color-mix(in_srgb,var(--color-sage)_30%,transparent)] text-sm text-[var(--color-sage-deep)] font-medium">
          {t("admin.driveConnectedBanner")}
        </div>
      )}
      {errorParam && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-sm text-red-600 font-medium">{errorParam}</div>
      )}

      <Card className="p-6">
        {status === "loading" && <p className="text-sm text-[var(--text-secondary)]">{t("admin.driveCheckingConnection")}</p>}

        {status === "connected" && (
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] flex items-center justify-center text-[var(--color-sage-deep)] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="font-semibold">{t("admin.driveConnectedTitle")}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{t("admin.driveConnectedDescription")}</p>
              <Button variant="outline" size="sm" className="mt-4" disabled={!connectHref} onClick={() => connectHref && (window.location.href = connectHref)}>
                <HardDrive size={14} /> {t("admin.driveReconnectButton")}
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
              <p className="font-semibold">{t("admin.driveNotConnectedTitle")}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{t("admin.driveNotConnectedDescription")}</p>
              <Button className="mt-4" disabled={!connectHref} onClick={() => connectHref && (window.location.href = connectHref)}>
                <ExternalLink size={14} /> {t("admin.driveConnectButton")}
              </Button>
              {!connectHref && <p className="text-[11px] text-[var(--text-secondary)] mt-2">{t("admin.drivePreparingSession")}</p>}
            </div>
          </div>
        )}
      </Card>

      {status === "connected" && (
        <Card className="p-6 mt-5">
          <h3 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
            <Database size={16} /> {t("admin.driveStorageHeading")}
          </h3>
          {storage ? (
            storage.limitBytes === null ? (
              <p className="text-sm text-[var(--text-secondary)]">{t("admin.driveUnlimitedStorage")}</p>
            ) : (
              <div>
                <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-gold)]"
                    style={{ width: `${Math.min(100, (storage.usageBytes / storage.limitBytes) * 100)}%` }}
                  />
                </div>
                <p className="text-sm mt-3">
                  <span className="font-semibold">{formatBytesLarge(storage.usageBytes)}</span> {t("admin.driveStorageOfLabel")} {formatBytesLarge(storage.limitBytes)}{" "}
                  {t("admin.driveStorageUsedLabel")} ·{" "}
                  <span className="font-semibold">{formatBytesLarge(Math.max(0, storage.limitBytes - storage.usageBytes))}</span> {t("admin.driveStorageFreeLabel")}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-2">{t("admin.driveStorageAccountNote")}</p>
              </div>
            )
          ) : storageUnavailable ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("admin.driveStorageUnavailable")}</p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">{t("admin.driveStorageChecking")}</p>
          )}
        </Card>
      )}
    </div>
  );
}
