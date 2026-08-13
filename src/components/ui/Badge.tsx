import { cn } from "@/lib/utils";

type Tone = "gold" | "blue" | "sage" | "neutral" | "danger";

const tones: Record<Tone, string> = {
  gold: "bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[var(--color-gold-deep)]",
  blue: "bg-[color-mix(in_srgb,var(--color-blue)_16%,transparent)] text-[var(--color-blue-deep)]",
  sage: "bg-[color-mix(in_srgb,var(--color-sage)_18%,transparent)] text-[var(--color-sage-deep)]",
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
