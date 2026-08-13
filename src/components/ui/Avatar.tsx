import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

export function Avatar({
  name,
  color = "var(--color-gold)",
  size = "md",
  className,
  ring,
}: {
  name: string;
  color?: string;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none",
        sizes[size],
        ring && "ring-2 ring-[var(--bg-elevated-solid)]",
        className
      )}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, black))` }}
    >
      {initials(name)}
    </div>
  );
}
