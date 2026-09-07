"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Markdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Send, Plus, History, Pencil, Trash2, Check, X, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AiDisclaimerModal } from "@/components/ai/AiDisclaimerModal";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { translateApiError } from "@/lib/i18n/errors";
import { timeAgo, cn } from "@/lib/utils";
import type { AiChatMessage, AiConversation, AiConversationSummary } from "@/lib/types";

const MAX_MESSAGE_LENGTH = 6000;
const DISCLAIMER_ACK_KEY = "dwky-ai-disclaimer-acknowledged";

const markdownComponents = {
  p: ({ node, ...props }: React.HTMLAttributes<HTMLParagraphElement> & ExtraProps) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }: React.HTMLAttributes<HTMLUListElement> & ExtraProps) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
  ol: ({ node, ...props }: React.OlHTMLAttributes<HTMLOListElement> & ExtraProps) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
  h1: ({ node, ...props }: React.HTMLAttributes<HTMLHeadingElement> & ExtraProps) => (
    <h3 className="font-display text-base font-semibold mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }: React.HTMLAttributes<HTMLHeadingElement> & ExtraProps) => (
    <h3 className="font-display text-base font-semibold mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }: React.HTMLAttributes<HTMLHeadingElement> & ExtraProps) => (
    <h4 className="font-display text-sm font-semibold mt-2.5 mb-1 first:mt-0" {...props} />
  ),
  strong: ({ node, ...props }: React.HTMLAttributes<HTMLElement> & ExtraProps) => <strong className="font-semibold" {...props} />,
  code: ({ node, ...props }: React.HTMLAttributes<HTMLElement> & ExtraProps) => (
    <code className="px-1 py-0.5 rounded bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-[12.5px]" {...props} />
  ),
  pre: ({ node, ...props }: React.HTMLAttributes<HTMLPreElement> & ExtraProps) => (
    <pre className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] overflow-x-auto text-[12.5px] mb-2" {...props} />
  ),
  table: ({ node, ...props }: React.TableHTMLAttributes<HTMLTableElement> & ExtraProps) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-[13px] border-collapse" {...props} />
    </div>
  ),
  th: ({ node, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & ExtraProps) => (
    <th className="border border-[var(--border-soft)] px-2 py-1 text-left font-semibold" {...props} />
  ),
  td: ({ node, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & ExtraProps) => (
    <td className="border border-[var(--border-soft)] px-2 py-1" {...props} />
  ),
  a: ({ node, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) => (
    <a className="underline hover:no-underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
};

function AiAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center text-white"
      style={{ width: size, height: size, background: "linear-gradient(135deg, var(--color-blue), var(--color-sage))" }}
    >
      <Sparkles size={Math.round(size * 0.5)} />
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <AiAvatar />
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-elevated)] border border-[var(--border-soft)] flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && <AiAvatar />}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed break-words",
          isUser ? "bg-[var(--color-blue)] text-white rounded-tr-sm whitespace-pre-wrap" : "bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-tl-sm"
        )}
      >
        {isUser ? message.content : <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</Markdown>}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onOpen,
  onRenamed,
  onDeleted,
}: {
  conversation: AiConversationSummary;
  active: boolean;
  onOpen: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  const { t, language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);

  async function saveRename() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === conversation.title) {
      setEditing(false);
      setTitle(conversation.title);
      return;
    }
    try {
      await apiPatch(`/api/ai/conversations/${conversation.id}`, { title: trimmed });
      onRenamed(trimmed);
      setEditing(false);
    } catch {
      setBusyError(t("aiChat.renameFailed"));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/api/ai/conversations/${conversation.id}`);
      onDeleted();
    } catch {
      setBusyError(t("aiChat.deleteFailed"));
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") {
              setEditing(false);
              setTitle(conversation.title);
            }
          }}
          maxLength={100}
          className="flex-1 min-w-0 text-[13px] px-2 py-1 rounded-lg border border-[var(--color-blue)] bg-transparent outline-none"
        />
        <button onClick={saveRename} className="p-1 text-[var(--color-blue-deep)]" title={t("aiChat.renameSave")}>
          <Check size={14} />
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setTitle(conversation.title);
          }}
          className="p-1 text-[var(--text-secondary)]"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className={cn(
          "w-full text-left pl-3 pr-16 py-2.5 rounded-xl text-[13px] transition-colors",
          active
            ? "bg-[color-mix(in_srgb,var(--color-blue)_12%,transparent)] text-[var(--color-blue-deep)] font-semibold"
            : "hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
        )}
      >
        <p className="truncate">{conversation.title}</p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-normal">{timeAgo(conversation.updatedAt, language)}</p>
      </button>
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
          title={t("aiChat.renameTitle")}
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10"
          title={t("common.delete")}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={confirmDelete}
        title={t("aiChat.deleteConfirmTitle")}
        message={t("aiChat.deleteConfirmMessage")}
        confirming={deleting}
        error={busyError}
      />
    </div>
  );
}

export default function AiChatPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Tracked in sessionStorage (not localStorage/a profile field) — cleared automatically when the
  // tab or browser closes, so the disclaimer reappears next session but not on every navigation
  // within the same one. Defaults to true so server-rendered markup matches the pre-hydration DOM.
  const [disclaimerOpen, setDisclaimerOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(DISCLAIMER_ACK_KEY) === "true") {
      setDisclaimerOpen(false);
    }
  }, []);

  useEffect(() => {
    apiGet<{ conversations: AiConversationSummary[] }>("/api/ai/conversations")
      .then((d) => setConversations(d.conversations))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setHistoryOpen(false);
  }

  async function openConversation(id: string) {
    setHistoryOpen(false);
    if (id === conversationId) return;
    setError(null);
    try {
      const convo = await apiGet<AiConversation>(`/api/ai/conversations/${id}`);
      setConversationId(convo.id);
      setMessages(convo.messages);
    } catch {
      setError(t("aiChat.loadFailed"));
    }
  }

  function handleRenamed(id: string, title: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function handleDeleted(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) startNewConversation();
  }

  async function send(overrideText?: string) {
    const content = (overrideText ?? input).trim();
    if (!content || sending) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(t("aiChat.charLimitReached"));
      return;
    }
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date().toISOString() }]);
    setSending(true);
    try {
      const data = await apiPost<{ conversationId: string; title: string; updatedAt: string; message: AiChatMessage }>("/api/ai/chat", {
        conversationId: conversationId ?? undefined,
        message: content,
      });
      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === data.conversationId);
        const summary: AiConversationSummary = {
          id: data.conversationId,
          title: data.title,
          createdAt: existing?.createdAt ?? data.updatedAt,
          updatedAt: data.updatedAt,
        };
        return [summary, ...prev.filter((c) => c.id !== data.conversationId)];
      });
      setConversationId(data.conversationId);
    } catch (err) {
      setError(translateApiError(err, language));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!user) return null;

  const suggestions = [t("aiChat.suggestion1"), t("aiChat.suggestion2"), t("aiChat.suggestion3"), t("aiChat.suggestion4")];

  const historyList = (
    <div className="space-y-1">
      {conversations.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-secondary)] px-2 py-3">{t("aiChat.noHistoryYet")}</p>
      ) : (
        conversations.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            active={c.id === conversationId}
            onOpen={() => openConversation(c.id)}
            onRenamed={(title) => handleRenamed(c.id, title)}
            onDeleted={() => handleDeleted(c.id)}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-190px)] sm:h-[calc(100dvh-200px)] min-h-[420px]">
      <PageHeader
        eyebrow={t("aiChat.eyebrow")}
        title={t("aiChat.title")}
        description={t("aiChat.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDisclaimerOpen(true)}
              title={t("aiChat.disclaimerReopenLabel")}
              aria-label={t("aiChat.disclaimerReopenLabel")}
            >
              <Info size={15} />
            </Button>
            <Button variant="outline" size="md" className="md:hidden" onClick={() => setHistoryOpen(true)}>
              <History size={15} />
            </Button>
            <Button size="md" onClick={startNewConversation}>
              <Plus size={15} /> {t("aiChat.newConversation")}
            </Button>
          </div>
        }
      />

      <AiDisclaimerModal
        open={disclaimerOpen}
        onAcknowledge={() => {
          window.sessionStorage.setItem(DISCLAIMER_ACK_KEY, "true");
          setDisclaimerOpen(false);
        }}
      />

      <div className="flex-1 min-h-0 flex gap-5">
        <Card hover={false} glass={false} className="hidden md:flex md:flex-col w-64 shrink-0 p-3 overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] px-2 py-2">{t("aiChat.historyHeading")}</p>
          <div className="flex-1 overflow-y-auto">{historyList}</div>
        </Card>

        <Card hover={false} glass={false} className="flex-1 min-w-0 flex flex-col overflow-hidden !p-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="max-w-lg mx-auto text-center pt-4 sm:pt-8">
                <div className="flex justify-center mb-4">
                  <AiAvatar size={52} />
                </div>
                <h2 className="font-display text-xl font-semibold mb-2">{t("aiChat.welcomeTitle")}</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6">{t("aiChat.welcomeMessage")}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
                  {t("aiChat.suggestedPromptsHeading")}
                </p>
                <div className="flex flex-col gap-2 text-left">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="px-4 py-2.5 rounded-xl border border-[var(--border-soft)] text-[13.5px] hover:border-[var(--color-blue)] hover:bg-[color-mix(in_srgb,var(--color-blue)_6%,transparent)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {sending && <TypingBubble />}
              </>
            )}
          </div>

          <div className="border-t border-[var(--border-soft)] p-3 sm:p-4">
            {error && <p className="text-[12px] text-red-500 font-medium mb-2">{error}</p>}
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("aiChat.inputPlaceholder")}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={sending}
                className="flex-1 resize-none text-sm bg-transparent outline-none px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] focus:border-[var(--color-blue)] transition-colors max-h-32 disabled:opacity-60"
              />
              <Button size="icon" onClick={() => send()} disabled={!input.trim() || sending} loading={sending}>
                <Send size={16} />
              </Button>
            </div>
            <p className="text-[10.5px] text-[var(--text-secondary)] mt-2">{t("aiChat.disclaimer")}</p>
          </div>
        </Card>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t("aiChat.historyHeading")} size="sm">
        {historyList}
      </Modal>
    </div>
  );
}
