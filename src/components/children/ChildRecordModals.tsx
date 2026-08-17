"use client";

import { useRef, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { pickColor, useAppStore } from "@/lib/store";
import { uploadToDrive } from "@/lib/upload";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";
import { enumLabels } from "@/lib/i18n/enum-labels";
import type { ArtworkItem, PhotoAlbum, VideoItem, ChildDocument, SpiritualMilestone } from "@/lib/types";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";
const today = () => new Date().toISOString().slice(0, 10);

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-gold-deep)] px-3 py-1.5 rounded-full border border-[var(--color-gold-light)] hover:bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] transition-colors"
    >
      <Plus size={13} /> {label}
    </button>
  );
}

function FilePickerField({
  label,
  accept,
  files,
  onChange,
  disabled,
}: {
  label: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  return (
    <div>
      <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</label>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={accept.startsWith("image/")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-[var(--border-soft)] hover:border-[var(--color-gold)] transition-colors text-sm text-left disabled:opacity-50"
      >
        <UploadCloud size={16} className="text-[var(--color-gold-deep)] shrink-0" />
        <span className="truncate text-[var(--text-secondary)]">
          {files.length > 0 ? files.map((f) => f.name).join(", ") : t("children.filePickerPlaceholder")}
        </span>
      </button>
    </div>
  );
}

function UploadError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-[11px] text-red-500 font-medium">{message}</p>;
}

export function AddArtworkButton({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ArtworkItem["category"]>("Drawing");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  function reset() {
    setTitle("");
    setFiles([]);
    setError(null);
    setOpen(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const file = files[0];
      const uploaded = file ? await uploadToDrive(file, "children", childId) : undefined;
      await useAppStore.getState().addArtwork(childId, {
        title: title.trim(),
        category,
        date: today(),
        imageColor: pickColor(Date.now()),
        driveFileId: uploaded?.fileId,
        driveViewUrl: uploaded?.viewUrl,
      });
      reset();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label={t("children.addArtworkButtonLabel")} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title={t("children.artworkModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("children.artworkTitlePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ArtworkItem["category"])} className={inputClass}>
              <option value="Drawing">{enumLabels.artworkCategory[language].Drawing}</option>
              <option value="Coloring Page">{enumLabels.artworkCategory[language]["Coloring Page"]}</option>
              <option value="Craft">{enumLabels.artworkCategory[language].Craft}</option>
              <option value="Worksheet">{enumLabels.artworkCategory[language].Worksheet}</option>
            </select>
          </div>
          <FilePickerField label={`${t("children.artworkPhotoLabel")} (${t("common.optional")})`} accept="image/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            {t("common.add")}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function AddAlbumButton({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  function reset() {
    setTitle("");
    setEvent("");
    setFiles([]);
    setError(null);
    setOpen(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      let firstUpload: { fileId: string; viewUrl: string } | undefined;
      for (const file of files) {
        const uploaded = await uploadToDrive(file, "children", childId);
        if (!firstUpload) firstUpload = uploaded;
      }
      await useAppStore.getState().addAlbum(childId, {
        title: title.trim(),
        event: event.trim() || "General",
        date: today(),
        photoCount: Math.max(1, files.length),
        coverColor: pickColor(Date.now()),
        driveFileId: firstUpload?.fileId,
        driveViewUrl: firstUpload?.viewUrl,
      } satisfies Omit<PhotoAlbum, "id">);
      reset();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label={t("children.addAlbumButtonLabel")} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title={t("children.albumModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.albumTitleLabel")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("children.albumTitlePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.eventLabel")}</label>
            <input value={event} onChange={(e) => setEvent(e.target.value)} className={inputClass} placeholder={t("children.eventPlaceholder")} />
          </div>
          <FilePickerField label={t("children.albumPhotosLabel")} accept="image/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            {t("common.add")}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function AddVideoButton({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VideoItem["category"]>("Recitation");
  const [duration, setDuration] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  function reset() {
    setTitle("");
    setDuration("");
    setFiles([]);
    setError(null);
    setOpen(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const file = files[0];
      const uploaded = file ? await uploadToDrive(file, "children", childId) : undefined;
      await useAppStore.getState().addVideo(childId, {
        title: title.trim(),
        category,
        date: today(),
        duration: duration || "0:30",
        coverColor: pickColor(Date.now()),
        driveFileId: uploaded?.fileId,
        driveViewUrl: uploaded?.viewUrl,
      });
      reset();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label={t("children.addVideoButtonLabel")} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title={t("children.videoModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("children.videoTitlePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as VideoItem["category"])} className={inputClass}>
              <option value="Recitation">{enumLabels.videoCategory[language].Recitation}</option>
              <option value="Performance">{enumLabels.videoCategory[language].Performance}</option>
              <option value="Activity">{enumLabels.videoCategory[language].Activity}</option>
              <option value="Special Event">{enumLabels.videoCategory[language]["Special Event"]}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.durationLabel")}</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} placeholder={t("children.durationPlaceholder")} />
          </div>
          <FilePickerField label={t("children.videoFileLabel")} accept="video/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            {t("common.add")}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function AddChildDocumentButton({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChildDocument["type"]>("Permission Form");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  function reset() {
    setTitle("");
    setFiles([]);
    setError(null);
    setOpen(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const file = files[0];
      const ext = file?.name.split(".").pop()?.toLowerCase();
      const fileType: ChildDocument["fileType"] = ext === "doc" || ext === "docx" ? "docx" : "pdf";
      const uploaded = file ? await uploadToDrive(file, "children", childId) : undefined;
      await useAppStore.getState().addChildDocument(childId, {
        title: title.trim(),
        type,
        fileType,
        date: today(),
        driveFileId: uploaded?.fileId,
        driveViewUrl: uploaded?.viewUrl,
      });
      reset();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label={t("children.addDocumentButtonLabel")} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title={t("children.documentModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("children.documentTitlePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.type")}</label>
            <select value={type} onChange={(e) => setType(e.target.value as ChildDocument["type"])} className={inputClass}>
              <option value="Permission Form">{enumLabels.childDocumentType[language]["Permission Form"]}</option>
              <option value="Evaluation">{enumLabels.childDocumentType[language].Evaluation}</option>
              <option value="Progress Report">{enumLabels.childDocumentType[language]["Progress Report"]}</option>
              <option value="Attendance Note">{enumLabels.childDocumentType[language]["Attendance Note"]}</option>
            </select>
          </div>
          <FilePickerField label={`${t("children.documentFileLabel")} (${t("common.optional")})`} accept=".pdf,.doc,.docx" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            {t("common.add")}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function AddMilestoneButton({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<SpiritualMilestone["category"]>("Memory Verse");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t, language } = useLanguage();

  async function submit() {
    if (!label.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await useAppStore.getState().addMilestone(childId, { label: label.trim(), category, date: today(), note: note.trim() || undefined });
      setLabel("");
      setNote("");
      setOpen(false);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AddButton label={t("children.addMilestoneButtonLabel")} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={t("children.milestoneModalTitle")} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("children.milestoneFieldLabel")}</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder={t("children.milestoneFieldPlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("common.category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as SpiritualMilestone["category"])} className={inputClass}>
              <option value="Memory Verse">{enumLabels.milestoneCategory[language]["Memory Verse"]}</option>
              <option value="Bible Knowledge">{enumLabels.milestoneCategory[language]["Bible Knowledge"]}</option>
              <option value="Participation">{enumLabels.milestoneCategory[language].Participation}</option>
              <option value="Prayer">{enumLabels.milestoneCategory[language].Prayer}</option>
              <option value="Kindness">{enumLabels.milestoneCategory[language].Kindness}</option>
              <option value="Achievement">{enumLabels.milestoneCategory[language].Achievement}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
              {t("children.milestoneNoteLabel")} ({t("common.optional")})
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
          </div>
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!label.trim() || submitting} loading={submitting}>
            {t("common.add")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
