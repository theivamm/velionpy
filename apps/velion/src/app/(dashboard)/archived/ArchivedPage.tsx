"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiCheckCircle, HiXCircle,
} from "react-icons/hi";
import { useLanguage, useAuth, createClient, GlassCard, Button, ModalPortal } from "@velion/shared";
import type { PillarIdea, PieceType, IdeaStatus, IdeaComment, Profile, CalendarPiece } from "@velion/shared/types";
import { PieceViewerModal } from "@/components/PieceViewerModal";
import {
  format,
  parse,
  formatDistanceToNow,
} from "date-fns";
import { es } from "date-fns/locale";

export function ArchivedPage() {
  const [ideas, setIdeas] = useState<PillarIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<PieceType | "all">("all");
  const [viewingIdea, setViewingIdea] = useState<PillarIdea | null>(null);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const dateLocale = language === "es" ? es : undefined;

  const fetchArchived = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("pillar_ideas")
      .select("*")
      .eq("status", "archived")
      .order("updated_at", { ascending: false });
    if (data) setIdeas(data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const handleUnarchive = async (ideaId: string) => {
    if (!user) return;
    await supabase
      .from("pillar_ideas")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", ideaId);
    fetchArchived();
  };

  const filteredIdeas = typeFilter === "all" ? ideas : ideas.filter((i) => i.type === typeFilter);

  const typeCounts = ideas.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {} as Record<PieceType, number>);

  const pieceTypeColors: Record<PieceType, string> = {
    carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    story: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    reel: "bg-red-500/20 text-red-400 border-red-500/30",
    post: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const pillarPalette = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ];

  const statusColors: Record<IdeaStatus, string> = {
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    needs_revision: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    posted: "bg-emerald-500 text-white border-emerald-400",
    archived: "bg-stone-500/20 text-stone-400 border-stone-500/30",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {t.pillars.archivedIdeas}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {ideas.length} {language === "es" ? "ideas archivadas" : "archived ideas"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            typeFilter === "all"
              ? "bg-velion-cyan/15 border-velion-cyan/40 text-velion-cyan"
              : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
          }`}
        >
          {t.pillars.allTypes} ({ideas.length})
        </button>
        {(Object.keys(pieceTypeColors) as PieceType[]).map((pt) => (
          <button
            key={pt}
            onClick={() => setTypeFilter(pt)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              typeFilter === pt
                ? `${pieceTypeColors[pt]} shadow-sm`
                : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
            }`}
          >
            {(t.calendar.type as Record<string, string>)[pt]} ({typeCounts[pt] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <GlassCard className="!py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-4 opacity-30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="text-[var(--text-secondary)]">{t.pillars.noArchived}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <GlassCard
              key={idea.id}
              className="!p-4 cursor-pointer border-l-4 border-stone-500/50 hover:scale-[1.02] transition-all relative overflow-hidden group"
              onClick={() => setViewingIdea(idea)}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-md border ${pieceTypeColors[idea.type]}`}>
                  {(t.calendar.type as Record<string, string>)[idea.type]}
                </span>
                {idea.pillar && (
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${
                    pillarPalette[Math.abs(idea.pillar.length) % pillarPalette.length]
                  }`}>
                    {idea.pillar}
                  </span>
                )}
                {idea.theme && (
                  <span className="text-xs text-[var(--text-secondary)]">{idea.theme}</span>
                )}
              </div>
              <p className="text-sm font-medium">{idea.title}</p>
              {idea.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 whitespace-pre-wrap">{idea.description}</p>
              )}
              {idea.image_url && (
                <img src={idea.image_url} alt="" className="mt-2 w-full h-24 object-cover rounded-lg" />
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true, locale: dateLocale })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusColors.archived}`}>
                  {t.pillars.statuses.archived}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleUnarchive(idea.id); }}
                className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 font-medium opacity-0 group-hover:opacity-100 transition-all"
              >
                {t.pillars.unarchive}
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {viewingIdea && (
        <ArchivedIdeaDetailModal
          idea={viewingIdea}
          onClose={() => setViewingIdea(null)}
          onUnarchive={(id) => { handleUnarchive(id); setViewingIdea(null); }}
        />
      )}
    </div>
  );
}

function ArchivedIdeaDetailModal({
  idea,
  onClose,
  onUnarchive,
}: {
  idea: PillarIdea;
  onClose: () => void;
  onUnarchive: (ideaId: string) => void;
}) {
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [linkedPieces, setLinkedPieces] = useState<CalendarPiece[]>([]);
  const [viewingPiece, setViewingPiece] = useState<CalendarPiece | null>(null);
  const [viewingImage, setViewingImage] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [confirmUnarchive, setConfirmUnarchive] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const dateLocale = language === "es" ? es : undefined;

  const pieceTypeColors: Record<PieceType, string> = {
    carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    story: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    reel: "bg-red-500/20 text-red-400 border-red-500/30",
    post: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const pillarPalette = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ];

  useEffect(() => {
    const fetchData = async () => {
      const [commentsData, profilesData, piecesData] = await Promise.all([
        supabase
          .from("idea_comments")
          .select("*")
          .eq("idea_id", idea.id)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("*"),
        supabase
          .from("calendar_pieces")
          .select("*")
          .eq("pillar_idea_id", idea.id)
          .order("scheduled_date", { ascending: true }),
      ]);
      if (commentsData.data) setComments(commentsData.data);
      if (profilesData.data) {
        const map: Record<string, Profile> = {};
        profilesData.data.forEach((p) => { map[p.id] = p; });
        setProfilesMap(map);
      }
      if (piecesData.data) setLinkedPieces(piecesData.data);
    };
    fetchData();
  }, [idea.id, supabase]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, []);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
          <div
            className="w-full sm:w-[85vw] lg:w-[80vw] h-[90vh] sm:h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 rounded-t-2xl bg-stone-500" />

            <div className="glass-card !rounded-t-none flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto border-r border-[var(--glass-border)]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {idea.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {confirmUnarchive ? (
                      <>
                        <button
                          onClick={() => onUnarchive(idea.id)}
                          className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-all"
                        >
                          {t.pillars.unarchive}
                        </button>
                        <button
                          onClick={() => setConfirmUnarchive(false)}
                          className="text-xs px-3 py-1.5 rounded-md text-[var(--text-secondary)] hover:bg-white/10 transition-all"
                        >
                          {t.calendar.cancel}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmUnarchive(true)}
                        className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-all"
                      >
                        {t.pillars.unarchive}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-sm px-3 py-1 rounded-md border font-medium ${pieceTypeColors[idea.type]}`}>
                      {(t.calendar.type as Record<string, string>)[idea.type]}
                    </span>
                    {idea.pillar && (
                      <span className={`text-sm px-3 py-1 rounded-md border font-medium ${
                        pillarPalette[Math.abs(idea.pillar.length) % pillarPalette.length]
                      }`}>
                        {idea.pillar}
                      </span>
                    )}
                    {idea.theme && (
                      <span className="text-sm text-[var(--text-secondary)] font-medium">{idea.theme}</span>
                    )}
                  </div>

                  {idea.description && (
                    <div className="border border-[var(--glass-border)] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowDescription(!showDescription)}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold hover:bg-white/5 transition-colors"
                      >
                        <span>{t.pillars.ideaDescription}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`transition-transform duration-200 ${showDescription ? "rotate-180" : ""}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showDescription && (
                        <div className="px-4 pb-3">
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{idea.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {idea.image_url && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider font-semibold">{language === "es" ? "Imagen" : "Image"}</p>
                      <button onClick={() => setViewingImage(true)} className="w-full block">
                        <img src={idea.image_url} alt="" className="w-full rounded-xl max-h-64 object-cover hover:opacity-80 transition-opacity" />
                      </button>
                    </div>
                  )}

                  {linkedPieces.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider font-semibold">
                        {language === "es" ? "Piezas vinculadas" : "Linked pieces"} ({linkedPieces.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {linkedPieces.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setViewingPiece(p)}
                            className="rounded-xl border border-[var(--glass-border)] overflow-hidden text-left hover:border-velion-cyan/40 transition-all"
                          >
                            {p.media_url ? (
                              <img src={p.media_url} alt={p.title} className="w-full h-20 object-cover" />
                            ) : (
                              <div className="w-full h-16 flex items-center justify-center bg-white/5">
                                <span className="text-xs text-[var(--text-secondary)]">{(t.calendar.type as Record<string, string>)[p.type]}</span>
                              </div>
                            )}
                            <div className="p-2 bg-white/5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${pieceTypeColors[p.type]}`}>
                                {(t.calendar.type as Record<string, string>)[p.type]}
                              </span>
                              <span className="text-xs text-[var(--text-secondary)] ml-1 truncate">{p.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider font-semibold">{t.pillars.comments} ({comments.length})</p>
                    {comments.length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)] italic">{t.pillars.noIdeas}</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {comments.map((c) => {
                          const profile = profilesMap[c.user_id];
                          const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() || "—" : "—";
                          return (
                            <div key={c.id} className="p-2 rounded-lg bg-white/5 border border-[var(--glass-border)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-0.5">{name}</p>
                              <p className="text-sm">{c.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[380px] flex flex-col">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {t.pillars.archiveTitle}
                  </h4>
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <HiXCircle size={22} />
                  </button>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{t.pillars.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md border bg-stone-500/20 text-stone-400 border-stone-500/30`}>
                        {t.pillars.statuses.archived}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{t.pillars.pieceType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${pieceTypeColors[idea.type]}`}>
                        {(t.calendar.type as Record<string, string>)[idea.type]}
                      </span>
                    </div>

                    {idea.scheduled_date && (
                      <div>
                        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{t.pillars.schedule}</span>
                        <p className="text-sm text-velion-cyan mt-0.5">
                          {format(parse(idea.scheduled_date, "yyyy-MM-dd", new Date()), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                        {language === "es" ? "Archivado" : "Archived"}
                      </span>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5">
                        {formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--glass-border)]">
                    {confirmUnarchive ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {language === "es" ? "¿Restaurar esta idea como borrador?" : "Restore this idea as draft?"}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => onUnarchive(idea.id)} className="!bg-emerald-500/20 !text-emerald-400 hover:!bg-emerald-500/30">
                            {t.pillars.unarchive}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmUnarchive(false)}>
                            {t.calendar.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setConfirmUnarchive(true)} className="w-full !bg-emerald-500/10 !text-emerald-400 hover:!bg-emerald-500/20">
                        {t.pillars.unarchive}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewingPiece && (
        <PieceViewerModal
          piece={viewingPiece}
          onClose={() => setViewingPiece(null)}
          onUpdate={() => {}}
        />
      )}
      {viewingImage && idea.image_url && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200]" onClick={() => setViewingImage(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img src={idea.image_url} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
                <button onClick={() => setViewingImage(false)} className="absolute -top-3 -right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <HiXCircle size={24} />
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ModalPortal>
  );
}
