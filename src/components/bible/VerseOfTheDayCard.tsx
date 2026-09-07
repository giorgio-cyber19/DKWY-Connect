"use client";

import { BookOpenText } from "lucide-react";
import { VerseOfTheDay } from "@youversion/platform-react-ui";
import { isYouVersionConfigured } from "./YouVersionThemeProvider";

export function VerseOfTheDayCard() {
  if (!isYouVersionConfigured) {
    return (
      <div className="mx-2.5 mb-2 p-3.5 rounded-xl bg-[var(--verse-card-bg)] shrink-0">
        <BookOpenText size={14} className="text-[var(--verse-text)] mb-1.5" />
        {/* Placeholder verse — shown until a YouVersion App Key is configured */}
        <p className="verse text-[13px] text-[var(--verse-text)]">
          &ldquo;Train up a child in the way he should go; even when he is old he will not depart from it.&rdquo;
        </p>
        <p className="text-[10.5px] font-semibold text-[var(--verse-text)] opacity-70 mt-1.5 uppercase tracking-wide">
          Proverbs 22:6
        </p>
      </div>
    );
  }

  return (
    <div className="verse-of-day-card mx-2.5 mb-2 rounded-xl overflow-hidden shrink-0">
      <VerseOfTheDay showBibleAppAttribution={false} showShareButton={false} />
    </div>
  );
}
