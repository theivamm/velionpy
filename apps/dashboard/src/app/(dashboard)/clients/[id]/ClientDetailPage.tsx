"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  HiArrowLeft, HiPencil, HiTrash, HiUser,
  HiCheckCircle, HiClock, HiSpeakerphone,
  HiMail, HiPhone, HiOfficeBuilding, HiDocumentText,
} from "react-icons/hi";
import { useLanguage, useAuth, createClient, GlassCard, Button, ModalPortal } from "@velion/shared";
import type { Client } from "@velion/shared/types";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const fetchClient = useCallback(async () => {
    if (!user || !clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .single();
    if (data) setClient(data);
    setLoading(false);
  }, [user, clientId, supabase]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleDelete = async () => {
    if (!client) return;
    await supabase.from("clients").delete().eq("id", client.id);
    router.push("/clients");
  };

  const statusColors = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    lead: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const statusIcons = {
    active: <HiCheckCircle size={16} />,
    inactive: <HiClock size={16} />,
    lead: <HiSpeakerphone size={16} />,
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-8 shimmer w-48 rounded-xl" />
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-[var(--text-secondary)]">Client not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/clients")}>
          <HiArrowLeft size={16} className="inline mr-1" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/clients")}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-[var(--text-secondary)]"
          >
            <HiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-velion-cyan to-velion-blue flex items-center justify-center text-white text-lg font-bold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">{client.name}</h1>
              {client.company && (
                <p className="text-sm text-[var(--text-secondary)]">{client.company}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <HiPencil size={14} className="inline mr-1" />
            {t.clients.editClient}
          </Button>
          {!confirmDelete ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <HiTrash size={14} />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                {t.clients.delete}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {t.calendar.cancel}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Contact Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HiMail size={18} className="text-velion-cyan shrink-0" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{t.clients.email}</p>
                <p className="text-sm">{client.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HiPhone size={18} className="text-velion-cyan shrink-0" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{t.clients.phone}</p>
                <p className="text-sm">{client.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HiOfficeBuilding size={18} className="text-velion-cyan shrink-0" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{t.clients.company}</p>
                <p className="text-sm">{client.company || "—"}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Status
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm px-3 py-1 rounded-md border flex items-center gap-1.5 ${statusColors[client.status]}`}>
              {statusIcons[client.status]}
              {t.clients.statuses[client.status]}
            </span>
          </div>
          {client.notes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HiDocumentText size={16} className="text-velion-cyan" />
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{t.clients.notes}</p>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </GlassCard>
      </div>

      {showEdit && (
        <ClientEditModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { fetchClient(); setShowEdit(false); }}
        />
      )}
    </div>
  );
}

function ClientEditModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [company, setCompany] = useState(client.company ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [status, setStatus] = useState<Client["status"]>(client.status);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const supabase = createClient();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      name: name.trim(),
      email: email.trim() || null,
      company: company.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      status,
      updated_at: new Date().toISOString(),
    }).eq("id", client.id);
    setSaving(false);
    if (!error) onSaved();
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const statusColors = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    lead: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="glass-card w-full max-w-lg p-6 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{t.clients.editClient}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)]">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.name}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.email}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.phone}</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.company}</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.notes}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.status}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "inactive", "lead"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(s)} className={`py-2 rounded-xl text-xs font-medium border transition-all ${status === s ? `${statusColors[s]} shadow-lg border-current` : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"}`}>
                      {t.clients.statuses[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={onClose}>{t.calendar.cancel}</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "..." : t.clients.save}</Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
