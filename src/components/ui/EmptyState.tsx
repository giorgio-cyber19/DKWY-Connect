import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)]">
        <Icon size={28} className="text-[var(--color-gold-deep)]" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-sm">{description}</p>}
    </div>
  );
}
