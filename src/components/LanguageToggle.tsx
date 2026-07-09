"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
      className="glass !p-2 rounded-xl text-velion-cyan hover:text-[var(--text-primary)] transition-all duration-300 font-semibold text-sm min-w-[36px]"
      aria-label="Toggle language"
    >
      {language.toUpperCase()}
    </button>
  );
}
