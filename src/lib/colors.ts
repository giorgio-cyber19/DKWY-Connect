const PALETTE = [
  "var(--color-gold)",
  "var(--color-blue)",
  "var(--color-sage)",
  "var(--color-gold-deep)",
  "var(--color-blue-deep)",
  "var(--color-sage-deep)",
];

export function pickColor(seed: number): string {
  return PALETTE[Math.abs(seed) % PALETTE.length];
}
