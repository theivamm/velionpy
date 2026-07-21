"use client";

import { useState, useEffect } from "react";
import {
  HiUser, HiDownload, HiUpload, HiTrash, HiClock,
  HiCheckCircle, HiExclamationCircle, HiRefresh, HiCog,
} from "react-icons/hi";
import { useLanguage, useAuth, createClient, GlassCard, Button } from "@velion/shared";
import type { Profile } from "@velion/shared/types";

interface Backup {
  name: string;
  size: number;
  createdAt: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [backupName, setBackupName] = useState("");
  const [backupMsg, setBackupMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const fetchBackups = async () => {
    setBackupsLoading(true);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      setBackupMsg({ type: "error", text: "Error al cargar backups" });
    }
    setBackupsLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  useEffect(() => {
    if (backupMsg) {
      const timer = setTimeout(() => setBackupMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [backupMsg]);

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

  const createBackup = async () => {
    setCreatingBackup(true);
    setBackupMsg(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: backupName.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setBackupMsg({ type: "success", text: `Backup "${data.backup.name}" creado` });
        setBackupName("");
        fetchBackups();
      } else {
        setBackupMsg({ type: "error", text: data.error || "Error al crear backup" });
      }
    } catch {
      setBackupMsg({ type: "error", text: "Error de conexion" });
    }
    setCreatingBackup(false);
  };

  const downloadBackup = async (fileName: string) => {
    const a = document.createElement("a");
    a.href = `/api/backup/download?file=${encodeURIComponent(fileName)}`;
    a.download = fileName;
    a.click();
  };

  const restoreBackup = async (fileName: string) => {
    if (!confirm(`Restaurar backup "${fileName}"? Se sobreescribiran los archivos actuales.`)) return;
    setRestoringBackup(fileName);
    setBackupMsg(null);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName }),
      });
      const data = await res.json();
      if (data.ok) {
        setBackupMsg({ type: "success", text: "Backup restaurado. Ejecuta pnpm install para reinstalar dependencias." });
      } else {
        setBackupMsg({ type: "error", text: data.error || "Error al restaurar" });
      }
    } catch {
      setBackupMsg({ type: "error", text: "Error de conexion" });
    }
    setRestoringBackup(null);
  };

  const deleteBackup = async (fileName: string) => {
    if (!confirm(`Eliminar backup "${fileName}"?`)) return;
    setDeletingBackup(fileName);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName, type: "delete" }),
      });
      const data = await res.json();
      if (data.ok) {
        setBackupMsg({ type: "success", text: "Backup eliminado" });
        fetchBackups();
      }
    } catch {
      setBackupMsg({ type: "error", text: "Error al eliminar" });
    }
    setDeletingBackup(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
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

      {backupMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
            backupMsg.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {backupMsg.type === "success" ? <HiCheckCircle size={18} /> : <HiExclamationCircle size={18} />}
          {backupMsg.text}
        </div>
      )}

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

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <HiDownload size={20} className="text-velion-cyan" />
          <h2 className="text-lg font-semibold">{t.settings.backup.create}</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t.settings.backup.description}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder={t.settings.backup.namePlaceholder}
            className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50"
          />
          <Button onClick={createBackup} disabled={creatingBackup}>
            {creatingBackup ? "..." : t.settings.backup.createButton}
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HiClock size={20} className="text-velion-cyan" />
            <h2 className="text-lg font-semibold">{t.settings.backup.list}</h2>
          </div>
          <button
            onClick={fetchBackups}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-secondary)]"
          >
            <HiRefresh size={18} />
          </button>
        </div>

        {backupsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 shimmer rounded-xl" />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            {t.settings.backup.noBackups}
          </p>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.name}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-white/[0.02] border border-[var(--glass-border)] hover:bg-white/10 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{backup.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatSize(backup.size)} · {formatDate(backup.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => downloadBackup(backup.name)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-velion-cyan"
                    title={t.settings.backup.download}
                  >
                    <HiDownload size={16} />
                  </button>
                  <button
                    onClick={() => restoreBackup(backup.name)}
                    disabled={restoringBackup === backup.name}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-amber-400"
                    title={t.settings.backup.restore}
                  >
                    <HiUpload size={16} />
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.name)}
                    disabled={deletingBackup === backup.name}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400"
                    title={t.settings.backup.delete}
                  >
                    <HiTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
