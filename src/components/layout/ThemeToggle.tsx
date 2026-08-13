"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors focus-ring overflow-hidden"
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
    </button>
  );
}
