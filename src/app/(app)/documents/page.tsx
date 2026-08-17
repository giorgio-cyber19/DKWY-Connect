"use client";

import { useMemo, useRef, useState } from "react";
import { Search, UploadCloud, FileText, FileSpreadsheet, FileType2, Download, Folder } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { uploadToDrive, driveDownloadUrl } from "@/lib/upload";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { DocumentItem } from "@/lib/types";

const fileIcons: Record<DocumentItem["fileType"], typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  xlsx: FileSpreadsheet,
};

const fileColors: Record<DocumentItem["fileType"], string> = {
  pdf: "var(--color-gold-deep)",
  docx: "var(--color-blue-deep)",
  xlsx: "var(--color-sage-deep)",
};

const categories: DocumentItem["category"][] = ["Permission Forms", "Evaluations", "Progress Reports", "Attendance Notes", "Policies"];

const extToFileType: Record<string, DocumentItem["fileType"]> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  xls: "xlsx",
  xlsx: "xlsx",
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const documentItems = useAppStore((s) => s.documentItems);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentItem["category"]>("Permission Forms");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return documentItems.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [documentItems, category, query]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const files = Array.from(e.target.files ?? []);
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uploaded = await uploadToDrive(file, "documents");
        await useAppStore.getState().createDocumentItem({
          name: uploaded.name,
          category: uploadCategory,
          fileType: extToFileType[ext] ?? "pdf",
          size: uploaded.size,
          uploadedBy: user.id,
          driveFileId: uploaded.fileId,
          driveViewUrl: uploaded.viewUrl,
        });
      }
      setUploadOpen(false);
    } catch (err) {
      setUploadError(translateApiError(err, language));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("documents.eyebrow")}
        title={t("documents.title")}
        description={t("documents.description")}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud size={15} /> {t("documents.uploadDocument")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("documents.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              category === "all" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
            }`}
          >
            {t("documents.categoryAll")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                category === c ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
              }`}
            >
              {enumLabels.documentCategory[language][c]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={documentItems.length === 0 ? t("documents.noDocumentsYetTitle") : t("documents.noDocumentsFoundTitle")}
          description={documentItems.length === 0 ? t("documents.noDocumentsYetDescription") : t("documents.noDocumentsFoundDescription")}
        />
      ) : (
        <StaggerGrid className="space-y-2.5">
          {filtered.map((d) => {
            const Icon = fileIcons[d.fileType];
            const color = fileColors[d.fileType];
            const uploader = getUser(d.uploadedBy);
            return (
              <Card key={d.id} className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{d.name}</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">
                    {uploader?.name} · {formatDate(d.uploadedAt, undefined, language)} · {d.size}
                  </p>
                </div>
                <Badge tone="neutral" className="hidden sm:inline-flex">{enumLabels.documentCategory[language][d.category]}</Badge>
                {d.driveFileId ? (
                  <a
                    href={driveDownloadUrl(d.driveFileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] shrink-0"
                    title={t("documents.downloadTitle")}
                  >
                    <Download size={16} />
                  </a>
                ) : (
                  <button className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] shrink-0" title={t("documents.addedBeforeDrive")} disabled>
                    <Download size={16} />
                  </button>
                )}
              </Card>
            );
          })}
        </StaggerGrid>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={t("documents.uploadDocument")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.category")}</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as DocumentItem["category"])}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {enumLabels.documentCategory[language][c]}
                </option>
              ))}
            </select>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFiles} disabled={uploading} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-[var(--border-soft)] rounded-2xl py-10 flex flex-col items-center text-center hover:border-[var(--color-gold)] transition-colors disabled:opacity-60"
          >
            <UploadCloud size={28} className="text-[var(--color-gold-deep)] mb-2.5" />
            <p className="text-sm font-semibold">{uploading ? t("documents.uploadingToDrive") : t("documents.clickToChooseFiles")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{t("documents.fileTypeHint")}</p>
          </button>
          {uploadError && <p className="text-[12px] text-red-500 font-medium">{uploadError}</p>}
        </div>
      </Modal>
    </div>
  );
}
