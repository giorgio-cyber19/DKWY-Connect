import { cn } from "@/lib/utils";

type Tone = "gold" | "blue" | "sage" | "coral" | "neutral" | "danger";

const tones: Record<Tone, string> = {
  gold: "bg-[var(--color-gold-light)] text-[var(--color-gold-deep)]",
  blue: "bg-[var(--color-blue-light)] text-[var(--color-blue-deep)]",
  sage: "bg-[var(--color-sage-light)] text-[var(--color-sage-deep)]",
  coral: "bg-[var(--color-coral-light)] text-[var(--color-coral-deep)]",
  neutral: "bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-[var(--text-secondary)]",
  danger: "bg-red-500/12 text-red-500",
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}
