"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CloudOff, RefreshCw, HardDrive, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";

export function DriveStatusCard() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"loading" | "connected" | "not_connected">("loading");

  async function checkStatus() {
    setStatus("loading");
    try {
      const res = await fetch("/api/drive/status");
      const data = await res.json();
      setStatus(data.connected ? "connected" : "not_connected");
    } catch {
      setStatus("not_connected");
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Card className="p-6">
      <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
        <HardDrive size={18} /> {t("settings.driveTitle")}
      </h3>

      {status === "loading" && <p className="text-sm text-[var(--text-secondary)]">{t("settings.checkingConnection")}</p>}

      {status === "connected" && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--color-sage)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-sage)_25%,transparent)]">
          <CheckCircle2 size={20} className="text-[var(--color-sage-deep)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("settings.connected")}</p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {t("settings.connectedDescription")}
            </p>
          </div>
          <Link href="/admin/connect-google-drive" className="text-[11px] font-semibold text-[var(--color-sage-deep)] flex items-center gap-1 shrink-0">
            {t("settings.manage")} <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {status === "not_connected" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-gold)_25%,transparent)]">
            <CloudOff size={20} className="text-[var(--color-gold-deep)] shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("settings.notConnected")}</p>
              <p className="text-[12px] text-[var(--text-secondary)]">{t("settings.notConnectedDescription")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/connect-google-drive">
              <Button size="sm">{t("settings.connectDrive")}</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={checkStatus}>
              <RefreshCw size={13} /> {t("settings.recheck")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
