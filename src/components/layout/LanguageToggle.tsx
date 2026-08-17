"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "nl" : "en")}
      className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors focus-ring overflow-hidden text-[17px] leading-none"
      aria-label={language === "en" ? "Switch to Dutch" : "Switch to English"}
      title={language === "en" ? "English" : "Nederlands"}
    >
      <motion.span
        key={language}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {language === "en" ? "🇬🇧" : "🇳🇱"}
      </motion.span>
    </button>
  );
}
