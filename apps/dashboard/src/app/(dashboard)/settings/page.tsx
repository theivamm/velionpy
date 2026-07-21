"use client";

import { useState, useEffect } from "react";
import {
  HiCog, HiDownload, HiUpload, HiTrash, HiClock,
  HiCheckCircle, HiExclamationCircle, HiRefresh,
} from "react-icons/hi";
import { useLanguage, GlassCard, Button } from "@velion/shared";

interface Backup {
  name: string;
  size: number;
  createdAt: string;
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [backupName, setBackupName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      setMessage({ type: "error", text: "Error al cargar backups" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const createBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: backupName.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: `Backup "${data.backup.name}" creado` });
        setBackupName("");
        fetchBackups();
      } else {
        setMessage({ type: "error", text: data.error || "Error al crear backup" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexion" });
    }
    setCreating(false);
  };

  const downloadBackup = async (fileName: string) => {
    const a = document.createElement("a");
    a.href = `/api/backup/download?file=${encodeURIComponent(fileName)}`;
    a.download = fileName;
    a.click();
  };

  const restoreBackup = async (fileName: string) => {
    if (!confirm(`Restaurar backup "${fileName}"? Se sobreescribiran los archivos actuales.`)) return;
    setRestoring(fileName);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "Backup restaurado. Ejecuta pnpm install para reinstalar dependencias." });
      } else {
        setMessage({ type: "error", text: data.error || "Error al restaurar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexion" });
    }
    setRestoring(null);
  };

  const deleteBackup = async (fileName: string) => {
    if (!confirm(`Eliminar backup "${fileName}"?`)) return;
    setDeleting(fileName);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName, type: "delete" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "Backup eliminado" });
        fetchBackups();
      }
    } catch {
      setMessage({ type: "error", text: "Error al eliminar" });
    }
    setDeleting(null);
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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <HiCog size={28} className="text-velion-cyan" />
        <h1 className="text-2xl font-bold gradient-text">{t.settings.title}</h1>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
            message.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {message.type === "success" ? <HiCheckCircle size={18} /> : <HiExclamationCircle size={18} />}
          {message.text}
        </div>
      )}

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
          <Button onClick={createBackup} disabled={creating}>
            {creating ? "..." : t.settings.backup.createButton}
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

        {loading ? (
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
                    disabled={restoring === backup.name}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-amber-400"
                    title={t.settings.backup.restore}
                  >
                    <HiUpload size={16} />
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.name)}
                    disabled={deleting === backup.name}
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
