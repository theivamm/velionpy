"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useLanguage, ThemeToggle, LanguageToggle } from "@velion/shared";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError(t.login.error);
    } else {
      router.push("/clients");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-velion-cyan/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-velion-blue/20 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="glass rounded-3xl p-8 md:p-10 animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">{t.app.name}</h1>
            <p className="text-[var(--text-secondary)] text-sm">{t.login.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                {t.login.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all"
                placeholder="admin@velion.py"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                {t.login.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-velion-blue to-[#01308a] text-white font-semibold text-sm hover:from-[#01308a] hover:to-velion-blue transition-all duration-300 shadow-lg shadow-velion-blue/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? t.login.loading : t.login.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
