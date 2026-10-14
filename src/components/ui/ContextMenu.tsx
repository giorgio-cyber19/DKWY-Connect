"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separator?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

/** Tracks where a right-click (or a tap on a mobile "+" button, via a manual open()
 * call) landed. `items` is resolved by the caller *inside* its event handler — not
 * read lazily during render — so building it can safely touch refs (e.g. to open a
 * hidden file input), which a resolver read during render is not allowed to do. */
export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);

  const open = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { state, open, close };
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, ready: false });

  // Clamp to the viewport once we know the menu's real size — a right-click near
  // the right or bottom edge shouldn't open a menu that runs off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clampedX = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const clampedY = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    setPos({ x: clampedX, y: clampedY, ready: true });
  }, [x, y]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: pos.ready ? 1 : 0, scale: 1 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[60] min-w-[200px] py-1.5 rounded-xl glass-solid card-shadow-hover border border-[var(--border-soft)]"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.separator && <div className="my-1.5 border-t border-[var(--border-soft)]" />}
          <button
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left transition-colors",
              item.disabled
                ? "opacity-40 cursor-not-allowed"
                : item.destructive
                  ? "text-red-500 hover:bg-red-500/10"
                  : "text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </motion.div>
  );
}
