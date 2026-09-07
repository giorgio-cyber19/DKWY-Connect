"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { useLanguage } from "@/lib/language-context";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirming,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirming?: boolean;
  error?: string | null;
}) {
  const { t } = useLanguage();

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{message}</p>
        {error && <p className="text-xs text-red-500 font-medium mb-4">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={confirming}>
            {confirmLabel ?? t("common.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
