"use client";

import { useState, useEffect } from "react";
import { HiUser } from "react-icons/hi";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
        }
      });
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const initials = [
    firstName.charAt(0).toUpperCase(),
    lastName.charAt(0).toUpperCase(),
  ]
    .filter(Boolean)
    .join("") || "?";

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold gradient-text">{t.settings.title}</h1>

      <GlassCard>
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-velion-cyan to-velion-blue flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {initials || <HiUser size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t.settings.profile}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t.settings.firstName}
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all"
                placeholder={language === "es" ? "Tu nombre" : "Your first name"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t.settings.lastName}
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all"
                placeholder={language === "es" ? "Tu apellido" : "Your last name"}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.settings.email}
            </label>
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-secondary)]/60 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          {saved && (
            <span className="text-xs text-emerald-400 animate-fade-in">
              {t.settings.saved}
            </span>
          )}
          <Button size="md" onClick={handleSave} disabled={saving}>
            {saving ? "..." : t.settings.save}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
