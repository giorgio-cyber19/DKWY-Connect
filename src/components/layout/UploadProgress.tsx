"use client";

import { CircleCheck, CircleAlert, Loader2, X } from "lucide-react";
import { useUploadTracker, uploadTracker, type UploadItem } from "@/lib/upload-tracker";
import { useLanguage } from "@/lib/language-context";
import { formatFileBytes } from "@/lib/format-bytes";

const MAX_VISIBLE = 4;

function Row({ item }: { item: UploadItem }) {
  const { t } = useLanguage();
  const fraction = item.total > 0 ? Math.min(item.loaded / item.total, 1) : item.status === "done" ? 1 : 0;
  const percent = item.status === "done" ? 100 : Math.floor(fraction * 100);
  // Everything has left the browser but our server is still passing it on to Google Drive.
  const finishing = item.status === "uploading" && item.total > 0 && item.loaded >= item.total;

  const barColor = item.status === "error" ? "bg-red-500" : item.status === "done" ? "bg-[var(--color-sage-deep)]" : "bg-[var(--color-gold)]";
  const status =
    item.status === "done"
      ? t("common.uploadDone")
      : item.status === "error"
        ? t("common.uploadFailed")
        : finishing
          ? t("common.uploadFinishing")
          : `${percent}%`;

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        {item.status === "done" ? (
          <CircleCheck size={16} className="shrink-0 text-[var(--color-sage-deep)]" />
        ) : item.status === "error" ? (
          <CircleAlert size={16} className="shrink-0 text-red-500" />
        ) : (
          <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-gold-deep)]" />
        )}
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium" title={item.name}>
          {item.name}
        </p>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--text-secondary)]">{status}</span>
        {item.status !== "uploading" && (
          <button
            type="button"
            onClick={() => uploadTracker.dismiss(item.id)}
            className="shrink-0 rounded-md p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring"
            aria-label={t("common.close")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-ink)_9%,transparent)]"
        role="progressbar"
        aria-label={item.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={`h-full rounded-full transition-[width] duration-200 ease-out ${barColor}`} style={{ width: `${item.status === "error" ? Math.max(percent, 4) : percent}%` }} />
      </div>
      {item.status === "uploading" && item.total > 0 && (
        <p className="mt-1 text-[11px] tabular-nums text-[var(--text-secondary)]">
          {formatFileBytes(Math.min(item.loaded, item.total))} / {formatFileBytes(item.total)}
        </p>
      )}
    </li>
  );
}

/** Floating panel with a progress bar for every file that is being uploaded or saved to Google Drive. */
export function UploadProgress() {
  const { t } = useLanguage();
  const items = useUploadTracker((s) => s.items);
  if (items.length === 0) return null;

  const active = items.filter((i) => i.status === "uploading").length;
  const shown = items.slice(-MAX_VISIBLE);
  const hidden = items.length - shown.length;
  const saving = active === 1 && items.some((i) => i.kind === "save" && i.status === "uploading");
  const title =
    active > 0
      ? `${saving ? t("common.savingFile") : t("common.uploadingFile")}${active > 1 ? ` (${active})` : ""}…`
      : items.some((i) => i.status === "error")
        ? t("common.uploadFailed")
        : t("common.uploadDone");

  return (
    <div
      className="no-print fixed bottom-24 left-4 right-4 z-[70] overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[22rem]"
      role="status"
      aria-live="polite"
    >
      <p className="border-b border-[var(--border-soft)] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{title}</p>
      <ul className="max-h-[50vh] divide-y divide-[var(--border-soft)] overflow-y-auto">
        {shown.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
      {hidden > 0 && <p className="border-t border-[var(--border-soft)] px-4 py-2 text-[11px] text-[var(--text-secondary)]">+{hidden}</p>}
    </div>
  );
}
