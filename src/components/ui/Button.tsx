"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-blue)] text-white shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--color-blue)_75%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-blue)_88%,white)]",
  secondary: "bg-[var(--color-gold)] text-[#151a2d]",
  outline: "border border-[var(--border-soft)] bg-transparent text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]",
  ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]",
  danger: "bg-red-500/90 text-white hover:bg-red-500 shadow-[0_4px_14px_-2px_rgba(239,68,68,0.4)]",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-6 py-3 gap-2 rounded-xl",
  icon: "p-2.5 rounded-xl",
};

export function Button({ className, variant = "primary", size = "md", loading, disabled, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </motion.button>
  );
}
