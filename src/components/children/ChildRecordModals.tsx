"use client";

import { useRef, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { pickColor, useAppStore } from "@/lib/store";
import { uploadToDrive, DriveNotConfiguredError } from "@/lib/upload";
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
          {files.length > 0 ? files.map((f) => f.name).join(", ") : "Choose a file…"}
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
      setError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label="Add Artwork" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title="Add Artwork" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Noah's Ark Coloring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ArtworkItem["category"])} className={inputClass}>
              <option>Drawing</option>
              <option>Coloring Page</option>
              <option>Craft</option>
              <option>Worksheet</option>
            </select>
          </div>
          <FilePickerField label="Photo (optional)" accept="image/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            Add
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
      setError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label="Add Album" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title="Add Photo Album" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Album Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Sunday Worship" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Event</label>
            <input value={event} onChange={(e) => setEvent(e.target.value)} className={inputClass} placeholder="e.g. VBS Week" />
          </div>
          <FilePickerField label="Photos (optional, pick multiple)" accept="image/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            Add
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
      setError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label="Add Video" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title="Add Video" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Psalm 23 Recitation" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as VideoItem["category"])} className={inputClass}>
              <option>Recitation</option>
              <option>Performance</option>
              <option>Activity</option>
              <option>Special Event</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Duration</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} placeholder="e.g. 1:24" />
          </div>
          <FilePickerField label="Video file (optional, up to 4MB)" accept="video/*" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            Add
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
      setError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AddButton label="Add Document" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={reset} title="Add Document" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Field Trip Permission Slip" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ChildDocument["type"])} className={inputClass}>
              <option>Permission Form</option>
              <option>Evaluation</option>
              <option>Progress Report</option>
              <option>Attendance Note</option>
            </select>
          </div>
          <FilePickerField label="File (optional)" accept=".pdf,.doc,.docx" files={files} onChange={setFiles} disabled={uploading} />
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!title.trim() || uploading} loading={uploading}>
            Add
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
      setError(err instanceof Error ? err.message : "Couldn't add the milestone. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AddButton label="Add Milestone" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add Spiritual Growth Milestone" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Milestone</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="e.g. Memorized John 3:16" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as SpiritualMilestone["category"])} className={inputClass}>
              <option>Memory Verse</option>
              <option>Bible Knowledge</option>
              <option>Participation</option>
              <option>Prayer</option>
              <option>Kindness</option>
              <option>Achievement</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
          </div>
          <UploadError message={error} />
          <Button className="w-full" onClick={submit} disabled={!label.trim() || submitting} loading={submitting}>
            Add
          </Button>
        </div>
      </Modal>
    </>
  );
}
