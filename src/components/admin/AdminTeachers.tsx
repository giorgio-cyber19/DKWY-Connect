"use client";

import { useState } from "react";
import { UserPlus, MoreVertical, KeyRound, Ban, CheckCircle2, Check, Copy, AtSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { getClass, useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { translateApiError } from "@/lib/i18n/errors";

const inputClass = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

function CredentialReveal({ email, tempPassword, onDone }: { email: string; tempPassword: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] text-[var(--color-sage-deep)] flex items-center justify-center">
        <Check size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold mb-1">{t("admin.teachersAccountCreatedTitle")}</p>
        <p className="text-[13px] text-[var(--text-secondary)]">
          {t("admin.teachersCredentialSharePrefix")} <strong>{email}</strong> {t("admin.teachersCredentialShareSuffix")}
        </p>
      </div>
      <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-black/[0.04] font-mono text-sm">
        <span className="flex-1">{tempPassword}</span>
        <button onClick={copy} className="p-1.5 rounded-lg hover:bg-black/5 text-[var(--text-secondary)]">
          {copied ? <Check size={15} className="text-[var(--color-sage-deep)]" /> : <Copy size={15} />}
        </button>
      </div>
      <Button className="w-full" onClick={onDone}>
        {t("common.done")}
      </Button>
    </div>
  );
}

function CreateTeacherModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useLanguage();
  const classes = useAppStore((s) => s.classes);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setUsername("");
    setClassId("");
    setTitle("");
    setError("");
    setCreated(null);
  }

  async function submit() {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { tempPassword } = await useAppStore.getState().createTeacher({
        name: name.trim(),
        email: email.trim(),
        username: username.trim() || undefined,
        classId: classId || null,
        title: title.trim() || "Teacher",
      });
      setCreated({ email: email.trim(), tempPassword });
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={created ? undefined : t("admin.teachersCreateButton")}
      size="sm"
    >
      {created ? (
        <CredentialReveal
          email={created.email}
          tempPassword={created.tempPassword}
          onDone={() => {
            reset();
            onClose();
          }}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersFullNameLabel")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t("admin.teachersFullNamePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersEmailAddressLabel")}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} placeholder={t("admin.teachersEmailPlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersUsernameOptionalLabel")}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder={t("admin.teachersUsernamePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersTitleOptionalLabel")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={t("admin.teachersTitlePlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersAssignClassLabel")}</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
              <option value="">{t("admin.teachersUnassignedOption")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11.5px] text-[var(--text-secondary)]">{t("admin.teachersTempPasswordNote")}</p>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <Button className="w-full" onClick={submit} loading={submitting} disabled={!name.trim() || !email.trim() || submitting}>
            {t("admin.teachersCreateAccountSubmitButton")}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function EditUsernameModal({ user, onClose }: { user: { id: string; name: string; username?: string } | null; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [username, setUsername] = useState(user?.username ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      await useAppStore.getState().setUsername(user.id, username.trim() || null);
      onClose();
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal key={user?.id} open={!!user} onClose={onClose} title={user ? `${t("admin.teachersUsernameModalTitlePrefix")} ${user.name}` : undefined} size="sm">
      {user && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("admin.teachersUsernameLabel")}</label>
            <input
              defaultValue={user.username ?? ""}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder={t("admin.teachersUsernamePlaceholder")}
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">{t("admin.teachersUsernameBlankHint")}</p>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <Button className="w-full" onClick={submit} loading={submitting} disabled={submitting}>
            {t("admin.teachersSaveUsernameButton")}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export function AdminTeachers() {
  const { t } = useLanguage();
  const users = useAppStore((s) => s.users);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [usernameTarget, setUsernameTarget] = useState<{ id: string; name: string; username?: string } | null>(null);

  function toggleStatus(id: string) {
    useAppStore.getState().toggleUserStatus(id);
    setMenuFor(null);
  }

  async function resetPassword(u: { id: string; email: string }) {
    setMenuFor(null);
    const tempPassword = await useAppStore.getState().resetUserPassword(u.id);
    setResetResult({ email: u.email, tempPassword });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[var(--text-secondary)]">
          {users.length} {users.length === 1 ? t("admin.teachersAccountSingular") : t("admin.teachersAccountPlural")} ·{" "}
          {users.filter((u) => u.status === "active").length} {t("admin.teachersActiveSuffix")}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus size={14} /> {t("admin.teachersCreateButton")}
        </Button>
      </div>

      <StaggerGrid className="space-y-2.5">
        {users.map((u) => {
          const cls = u.classId ? getClass(u.classId) : undefined;
          return (
            <StaggerItem key={u.id}>
              <Card className="p-4 flex items-center gap-3.5 relative">
                <Avatar name={u.name} color={u.avatarColor} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <Badge tone={u.role === "admin" ? "gold" : "blue"}>{u.role === "admin" ? t("common.admin") : t("common.teacher")}</Badge>
                    {u.status === "disabled" && <Badge tone="danger">{t("common.disabled")}</Badge>}
                  </div>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">
                    {u.email} {u.username && `· @${u.username}`} {cls && `· ${cls.name}`}
                  </p>
                </div>
                {u.role !== "admin" && (
                  <div className="relative">
                    <button onClick={() => setMenuFor(menuFor === u.id ? null : u.id)} className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-secondary)]">
                      <MoreVertical size={16} />
                    </button>
                    {menuFor === u.id && (
                      <div className="absolute right-0 top-full mt-1 w-52 glass-solid rounded-xl card-shadow-hover overflow-hidden z-10">
                        <button
                          onClick={() => {
                            setUsernameTarget({ id: u.id, name: u.name, username: u.username });
                            setMenuFor(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium hover:bg-black/[0.04]"
                        >
                          <AtSign size={14} /> {t("admin.teachersEditUsernameAction")}
                        </button>
                        <button onClick={() => resetPassword(u)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium hover:bg-black/[0.04]">
                          <KeyRound size={14} /> {t("admin.teachersResetPasswordAction")}
                        </button>
                        <button onClick={() => toggleStatus(u.id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium hover:bg-black/[0.04]">
                          {u.status === "active" ? <Ban size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-[var(--color-sage-deep)]" />}
                          {u.status === "active" ? t("admin.teachersDisableAccountAction") : t("admin.teachersReEnableAccountAction")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerGrid>

      <CreateTeacherModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={!!resetResult} onClose={() => setResetResult(null)} size="sm">
        {resetResult && <CredentialReveal email={resetResult.email} tempPassword={resetResult.tempPassword} onDone={() => setResetResult(null)} />}
      </Modal>

      <EditUsernameModal user={usernameTarget} onClose={() => setUsernameTarget(null)} />
    </div>
  );
}
