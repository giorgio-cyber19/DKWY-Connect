import Link from "next/link";
import Image from "next/image";

export const LEGAL_ORG = "Duta Watjana Kids & Youth Committee";
export const LEGAL_CONTACT_EMAIL = "dwky.connect@gmail.com";
export const LEGAL_UPDATED = "22 October 2026";

/** Shared, publicly reachable shell for the Privacy Policy and Terms of Service (no sign-in required). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/login" className="flex items-center gap-2.5">
            <span className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
              <Image src="/seal.png" alt="" fill sizes="36px" className="object-cover" />
            </span>
            <span className="font-display font-semibold text-lg tracking-tight">DWKY Connect</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-[var(--text-secondary)] [&>a:hover]:text-[var(--text-primary)]">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
          </nav>
        </div>

        <main className="bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-[20px] p-6 sm:p-10">
          <h1 className="font-display text-3xl font-semibold mb-1">{title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            {LEGAL_ORG} · Last updated {LEGAL_UPDATED}
          </p>
          <div className="space-y-4 text-[15px] leading-relaxed">{children}</div>
        </main>

        <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
          Questions? Email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold pt-4">{children}</h2>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5">{children}</ul>;
}
