"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Quote } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";

const POINTS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "aiChat.disclaimerPoint1Title", body: "aiChat.disclaimerPoint1Body" },
  { title: "aiChat.disclaimerPoint2Title", body: "aiChat.disclaimerPoint2Body" },
  { title: "aiChat.disclaimerPoint3Title", body: "aiChat.disclaimerPoint3Body" },
  { title: "aiChat.disclaimerPoint4Title", body: "aiChat.disclaimerPoint4Body" },
];

/**
 * Acknowledgement is tracked by the caller in sessionStorage, not here and not
 * permanently (no localStorage/profile flag) — see ai-chat/page.tsx.
 * Cannot be dismissed except via the acknowledge button: no backdrop click,
 * no Escape, no close icon. Focus is trapped to the two elements inside
 * (scrollable content + button) for the whole time it's open.
 */
export function AiDisclaimerModal({ open, onAcknowledge }: { open: boolean; onAcknowledge: () => void }) {
  const { t } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => contentRef.current?.focus(), 0);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = [contentRef.current, buttonRef.current].filter(Boolean) as HTMLElement[];
      if (focusables.length === 0) return;
      e.preventDefault();
      const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
      const nextIndex = e.shiftKey
        ? currentIndex <= 0
          ? focusables.length - 1
          : currentIndex - 1
        : currentIndex === -1 || currentIndex === focusables.length - 1
          ? 0
          : currentIndex + 1;
      focusables[nextIndex]?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div key="ai-disclaimer" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-disclaimer-title"
            className="relative w-full max-w-lg sm:max-w-xl glass-solid rounded-[28px] card-shadow-hover flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div ref={contentRef} tabIndex={0} className="flex-1 overflow-y-auto p-6 sm:p-8 focus-ring rounded-t-[28px]">
              <div className="flex flex-col items-center text-center mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white mb-3 shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--color-blue), var(--color-sage))" }}
                >
                  <BookOpen size={26} />
                </div>
                <h2 id="ai-disclaimer-title" className="font-display text-xl sm:text-2xl font-bold">
                  {t("aiChat.disclaimerTitle")}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">{t("aiChat.disclaimerSubtitle")}</p>
              </div>

              <div className="space-y-2.5 text-[13.5px] sm:text-sm leading-relaxed mb-5">
                <p>{t("aiChat.disclaimerBody1")}</p>
                <p className="text-[var(--text-secondary)]">{t("aiChat.disclaimerBody2")}</p>
              </div>

              <h3 className="font-display text-base font-semibold mb-3">{t("aiChat.disclaimerSectionHeading")}</h3>
              <ul className="space-y-3 mb-6">
                {POINTS.map((point, i) => (
                  <li key={point.title} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
                      style={{ background: "var(--color-gold)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[13.5px] sm:text-sm leading-relaxed">
                      <span className="font-semibold">{t(point.title)}</span> <span className="text-[var(--text-secondary)]">{t(point.body)}</span>
                    </p>
                  </li>
                ))}
              </ul>

              <div
                className="rounded-2xl px-5 py-4 mb-6 text-center border"
                style={{
                  background: "color-mix(in srgb, var(--color-gold) 12%, transparent)",
                  borderColor: "color-mix(in srgb, var(--color-gold) 40%, transparent)",
                }}
              >
                <Quote size={18} className="mx-auto mb-1.5" style={{ color: "var(--color-gold-deep)" }} />
                <p className="font-display text-base sm:text-lg font-bold" style={{ color: "var(--color-gold-deep)" }}>
                  {t("aiChat.disclaimerQuote")}
                </p>
              </div>

              <div className="border-t border-[var(--border-soft)] pt-5 text-center">
                <h4 className="font-display text-sm font-semibold mb-1.5">{t("aiChat.disclaimerClosingHeading")}</h4>
                <p className="text-[13px] sm:text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                  {t("aiChat.disclaimerClosingBody")}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border-soft)] p-4 sm:p-5 shrink-0">
              <motion.button
                ref={buttonRef}
                onClick={onAcknowledge}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="focus-ring w-full inline-flex items-center justify-center gap-2 text-base font-semibold px-6 py-3 rounded-xl text-white bg-[var(--color-blue)] hover:bg-[color-mix(in_srgb,var(--color-blue)_88%,white)] shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--color-blue)_75%,transparent)] transition-colors duration-200"
              >
                {t("aiChat.disclaimerButton")}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
