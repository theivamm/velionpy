"use client";

import { useLanguage } from "../contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
      className="rounded-xl text-velion-cyan hover:text-[var(--text-primary)] transition-all duration-300 font-semibold text-sm flex items-center justify-center bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--glass-shadow)] w-10 h-10"
      aria-label="Toggle language"
    >
      {language.toUpperCase()}
    </button>
  );
}
