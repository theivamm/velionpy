"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiPlus, HiSearch, HiUser, HiPencil, HiTrash,
  HiCheckCircle, HiClock, HiSpeakerphone,
} from "react-icons/hi";
import { useLanguage, useAuth, createClient, GlassCard, Button, ModalPortal } from "@velion/shared";
import type { Client } from "@velion/shared/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    lead: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const statusIcons = {
    active: <HiCheckCircle size={14} />,
    inactive: <HiClock size={14} />,
    lead: <HiSpeakerphone size={14} />,
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">{t.clients.title}</h1>
        <Button onClick={() => { setEditingClient(null); setShowForm(true); }}>
          <HiPlus size={16} className="inline mr-1" />
          {t.clients.addClient}
        </Button>
      </div>

      <div className="relative">
        <HiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.clients.search}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <GlassCard className="text-center py-12">
          <HiUser size={48} className="mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
          <p className="text-[var(--text-secondary)]">{t.clients.noClients}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <GlassCard
              key={client.id}
              className="!p-5 cursor-pointer hover:scale-[1.02] transition-all"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-velion-cyan to-velion-blue flex items-center justify-center text-white text-sm font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{client.name}</h3>
                    {client.company && (
                      <p className="text-xs text-[var(--text-secondary)]">{client.company}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusColors[client.status]}`}>
                  {statusIcons[client.status]}
                  {t.clients.statuses[client.status]}
                </span>
              </div>
              {client.email && (
                <p className="text-xs text-[var(--text-secondary)] mb-1">{client.email}</p>
              )}
              {client.phone && (
                <p className="text-xs text-[var(--text-secondary)]">{client.phone}</p>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => { setShowForm(false); setEditingClient(null); }}
          onSaved={() => { fetchClients(); setShowForm(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}

function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [status, setStatus] = useState<Client["status"]>(client?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);

    const clientData = {
      user_id: user.id,
      name: name.trim(),
      email: email.trim() || null,
      company: company.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      status,
    };

    let error;
    if (client) {
      const res = await supabase.from("clients").update(clientData).eq("id", client.id);
      error = res.error;
    } else {
      const res = await supabase.from("clients").insert(clientData);
      error = res.error;
    }

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
              <h3 className="text-lg font-semibold">
                {client ? t.clients.editClient : t.clients.addClient}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)]">
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.name}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.phone}</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.company}</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.notes}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.clients.status}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "inactive", "lead"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        status === s
                          ? `${statusColors[s]} shadow-lg border-current`
                          : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                      }`}
                    >
                      {t.clients.statuses[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t.calendar.cancel}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? "..." : t.clients.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
