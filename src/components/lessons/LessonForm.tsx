"use client";

import { useRef, useState } from "react";
import { Plus, X, MonitorPlay, FileText, Presentation, Image as ImageIcon, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { newClientId } from "@/lib/utils";
import { uploadToDrive, driveDownloadUrl, DriveNotConfiguredError } from "@/lib/upload";
import type { LessonAttachment, LessonPlan } from "@/lib/types";

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</label>
      <div className="space-y-2 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-black/[0.03] rounded-xl px-3.5 py-2">
            <span className="flex-1 text-sm">{item}</span>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-[var(--text-secondary)] hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

const extToType: Record<string, LessonAttachment["type"]> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  ppt: "pptx",
  pptx: "pptx",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
};

export function LessonForm({
  initial,
  lessonId,
  authorId,
  onSaved,
}: {
  initial?: Partial<LessonPlan>;
  lessonId?: string;
  authorId: string;
  onSaved: (status: "draft" | "published") => void;
}) {
  const ageGroups = useAppStore((s) => s.ageGroups);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [passage, setPassage] = useState(initial?.passage ?? "");
  const [theme, setTheme] = useState(initial?.theme ?? "");
  const [memoryVerse, setMemoryVerse] = useState(initial?.memoryVerse ?? "");
  const [ageGroupId, setAgeGroupId] = useState(initial?.ageGroupId ?? ageGroups[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [objectives, setObjectives] = useState<string[]>(initial?.objectives ?? []);
  const [openingActivity, setOpeningActivity] = useState(initial?.openingActivity ?? "");
  const [bibleStory, setBibleStory] = useState(initial?.bibleStory ?? "");
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>(initial?.discussionQuestions ?? []);
  const [craftActivity, setCraftActivity] = useState(initial?.craftActivity ?? "");
  const [worshipSongs, setWorshipSongs] = useState<string[]>(initial?.worshipSongs ?? []);
  const [closingPrayer, setClosingPrayer] = useState(initial?.closingPrayer ?? "");
  const [homework, setHomework] = useState(initial?.homework ?? "");
  const [attachments, setAttachments] = useState<LessonAttachment[]>(initial?.attachments ?? []);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileAccept = useRef<string>("");

  function openFilePicker(accept: string) {
    fileAccept.current = accept;
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploadingFiles(true);
    setAttachmentError(null);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uploaded = await uploadToDrive(file, "lessons");
        setAttachments((prev) => [
          ...prev,
          { id: newClientId("att"), name: uploaded.name, type: extToType[ext] ?? "pdf", driveFileId: uploaded.fileId, driveViewUrl: uploaded.viewUrl },
        ]);
      }
    } catch (err) {
      setAttachmentError(err instanceof DriveNotConfiguredError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  }

  function addYoutubeLink() {
    if (!youtubeUrl.trim()) return;
    setAttachments((prev) => [...prev, { id: newClientId("att"), name: youtubeUrl.trim(), type: "youtube" }]);
    setYoutubeUrl("");
    setYoutubeOpen(false);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSave(status: "draft" | "published") {
    if (!title.trim() || !ageGroupId) return;
    setSaving(status);
    setSaveError(null);
    const payload = {
      title: title.trim(),
      passage,
      theme,
      memoryVerse,
      ageGroupId,
      date,
      status,
      authorId,
      objectives,
      openingActivity,
      bibleStory,
      discussionQuestions,
      craftActivity,
      worshipSongs,
      closingPrayer,
      homework,
      attachments,
      coverColor: initial?.coverColor ?? "var(--color-gold)",
    };
    try {
      if (lessonId) {
        await useAppStore.getState().updateLesson(lessonId, payload);
      } else {
        await useAppStore.getState().createLesson(payload);
      }
      onSaved(status);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the lesson. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-8">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} disabled={uploadingFiles} />

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Lesson Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. David and Goliath" className={inputClass} />
          </Field>
        </div>
        <Field label="Bible Passage">
          <input value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="e.g. 1 Samuel 17:1–50" className={inputClass} />
        </Field>
        <Field label="Theme">
          <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. Courage & Trust in God" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Memory Verse">
            <input value={memoryVerse} onChange={(e) => setMemoryVerse(e.target.value)} placeholder="Verse text and reference" className={inputClass} />
          </Field>
        </div>
        <Field label="Age Group">
          <select value={ageGroupId} onChange={(e) => setAgeGroupId(e.target.value)} className={inputClass} disabled={ageGroups.length === 0}>
            {ageGroups.length === 0 && <option value="">No age groups yet — ask an admin to create one</option>}
            {ageGroups.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name} ({ag.range})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lesson Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
      </section>

      <section className="space-y-5">
        <h3 className="font-display font-semibold text-lg">Lesson Content</h3>
        <ListEditor label="Learning Objectives" items={objectives} onChange={setObjectives} placeholder="Add an objective and press Enter" />
        <Field label="Opening Activity">
          <textarea value={openingActivity} onChange={(e) => setOpeningActivity(e.target.value)} rows={2} className={inputClass} placeholder="How will you open the lesson?" />
        </Field>
        <Field label="Bible Story">
          <textarea value={bibleStory} onChange={(e) => setBibleStory(e.target.value)} rows={4} className={inputClass} placeholder="Outline how you'll tell the Bible story…" />
        </Field>
        <ListEditor label="Discussion Questions" items={discussionQuestions} onChange={setDiscussionQuestions} placeholder="Add a discussion question and press Enter" />
        <Field label="Craft Activity">
          <textarea value={craftActivity} onChange={(e) => setCraftActivity(e.target.value)} rows={2} className={inputClass} placeholder="Describe the craft activity" />
        </Field>
        <ListEditor label="Worship Songs" items={worshipSongs} onChange={setWorshipSongs} placeholder="Add a song title and press Enter" />
        <Field label="Closing Prayer">
          <textarea value={closingPrayer} onChange={(e) => setClosingPrayer(e.target.value)} rows={2} className={inputClass} placeholder="Write the closing prayer" />
        </Field>
        <Field label="Homework / Take-Home">
          <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={2} className={inputClass} placeholder="Any take-home activity for families" />
        </Field>
      </section>

      <section>
        <h3 className="font-display font-semibold text-lg mb-3">Attachments</h3>
        {attachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-black/[0.03] text-sm">
                {a.driveFileId ? (
                  <a href={driveDownloadUrl(a.driveFileId)} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">
                    {a.name}
                  </a>
                ) : (
                  <span className="flex-1 truncate">{a.name}</span>
                )}
                <button type="button" onClick={() => removeAttachment(a.id)} className="text-[var(--text-secondary)] hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={uploadingFiles}
            onClick={() => openFilePicker(".pdf")}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[var(--border-soft)] hover:border-[var(--color-gold)] hover:bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] transition-colors text-sm font-medium text-[var(--text-secondary)] disabled:opacity-50"
          >
            <FileText size={17} /> Upload PDF
          </button>
          <button
            type="button"
            disabled={uploadingFiles}
            onClick={() => openFilePicker(".doc,.docx,.ppt,.pptx")}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[var(--border-soft)] hover:border-[var(--color-gold)] hover:bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] transition-colors text-sm font-medium text-[var(--text-secondary)] disabled:opacity-50"
          >
            <Presentation size={17} /> Upload PowerPoint / Word
          </button>
          <button
            type="button"
            disabled={uploadingFiles}
            onClick={() => openFilePicker("image/*")}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[var(--border-soft)] hover:border-[var(--color-gold)] hover:bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] transition-colors text-sm font-medium text-[var(--text-secondary)] disabled:opacity-50"
          >
            <ImageIcon size={17} /> Upload Images
          </button>
          <button
            type="button"
            onClick={() => setYoutubeOpen((v) => !v)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[var(--border-soft)] hover:border-[var(--color-gold)] hover:bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] transition-colors text-sm font-medium text-[var(--text-secondary)]"
          >
            <MonitorPlay size={17} /> Add YouTube Link
          </button>
        </div>
        {youtubeOpen && (
          <div className="flex items-center gap-2 mt-3">
            <Link2 size={15} className="text-[var(--text-secondary)] shrink-0" />
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addYoutubeLink()}
              placeholder="https://youtube.com/…"
              className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)]"
            />
            <Button type="button" variant="outline" size="sm" onClick={addYoutubeLink}>
              Add
            </Button>
          </div>
        )}
        {uploadingFiles && <p className="text-[11px] text-[var(--color-gold-deep)] font-medium mt-3">Uploading to Google Drive…</p>}
        {attachmentError && <p className="text-[11px] text-red-500 font-medium mt-3">{attachmentError}</p>}
        <p className="text-[11px] text-[var(--text-secondary)] mt-3">
          Files are uploaded to your church&apos;s connected Google Drive (up to 4MB each).
        </p>
      </section>

      <div className="flex items-center gap-3 justify-end pt-4 border-t border-[var(--border-soft)]">
        {saveError && <p className="text-[12.5px] text-red-500 font-medium flex-1">{saveError}</p>}
        <Button variant="outline" onClick={() => handleSave("draft")} loading={saving === "draft"} disabled={!!saving || !title.trim()}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSave("published")} loading={saving === "published"} disabled={!!saving || !title.trim() || !ageGroupId}>
          Publish Lesson
        </Button>
      </div>
    </div>
  );
}
