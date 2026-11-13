import { Fragment } from "react";

/**
 * Plain text in which web addresses (http://, https:// or www.) become real links that open in a new tab.
 * Only those schemes are linked — never javascript: or anything else — and the text itself is rendered as text.
 */

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export function Linkified({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        // split() with a capturing group puts the matches at the odd positions.
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

        const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={className ?? "font-medium text-[var(--color-blue-deep)] underline underline-offset-2 break-all hover:opacity-80"}
            >
              {url}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}
