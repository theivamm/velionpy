"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import {
  HiPlus, HiChevronLeft, HiChevronRight, HiLightBulb,
  HiCheckCircle, HiPencil, HiClock, HiXCircle, HiChat, HiPaperAirplane, HiTrash, HiPhotograph, HiPaperClip, HiDownload,
} from "react-icons/hi";
import { useLanguage, useAuth, createClient, GlassCard, Button, ModalPortal } from "@velion/shared";
import type { MonthlyBrief, PillarIdea, IdeaStatus, IdeaComment, Profile, PieceType, PieceStatus, BriefCommentWithProfile, CalendarPiece } from "@velion/shared/types";
import { useSearchParams } from "next/navigation";
import { PieceViewerModal } from "@/components/PieceViewerModal";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  parse,
  formatDistanceToNow,
} from "date-fns";
import { es } from "date-fns/locale";
import JSZip from "jszip";

function PillarsContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [brief, setBrief] = useState<MonthlyBrief | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [ideas, setIdeas] = useState<PillarIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBrief, setSavingBrief] = useState(false);
  const [briefSaved, setBriefSaved] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<PillarIdea | null>(null);
  const [viewingIdea, setViewingIdea] = useState<PillarIdea | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingBrief, setEditingBrief] = useState(false);
  const [viewingBrief, setViewingBrief] = useState(false);
  const [pieces, setPieces] = useState<CalendarPiece[]>([]);
  const [viewingPiece, setViewingPiece] = useState<CalendarPiece | null>(null);
  const [viewingIdeaImageUrl, setViewingIdeaImageUrl] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const searchParams = useSearchParams();

  useEffect(() => {
    const ideaId = searchParams.get("ideaId");
    if (ideaId && ideas.length > 0) {
      const found = ideas.find((i) => i.id === ideaId);
      if (found) setViewingIdea(found);
    }
  }, [searchParams, ideas]);

  const monthStr = format(currentMonth, "yyyy-MM");
  const dateLocale = language === "es" ? es : undefined;
  const monthIdeas = ideas.filter((i) => {
    if (!i.scheduled_date) return false;
    const d = new Date(i.scheduled_date + "T00:00:00");
    return isSameMonth(d, currentMonth);
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [year, month] = monthStr.split("-").map(Number);

    const { data: briefData } = await supabase
      .from("monthly_briefs")
      .select("*")
      .eq("month", String(month).padStart(2, "0"))
      .eq("year", year)
      .single();

    if (briefData) {
      setBrief(briefData);
      setBriefContent(briefData.content);
    } else {
      setBrief(null);
      setBriefContent("");
    }

    const { data: ideasData } = await supabase
      .from("pillar_ideas")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (ideasData) setIdeas(ideasData);

    const { data: piecesData } = await supabase
      .from("calendar_pieces")
      .select("*");
    if (piecesData) setPieces(piecesData);

    setLoading(false);
    return ideasData;
  }, [user, monthStr, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveBrief = async () => {
    if (!user || !briefContent.trim()) return;
    setSavingBrief(true);
    setBriefSaved(false);
    const [year, month] = monthStr.split("-").map(Number);

    if (brief) {
      await supabase
        .from("monthly_briefs")
        .update({ content: briefContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", brief.id);
    } else {
      await supabase
        .from("monthly_briefs")
        .insert({
          user_id: user.id,
          month: String(month).padStart(2, "0"),
          year,
          content: briefContent.trim(),
        });
    }

    setSavingBrief(false);
    setBriefSaved(true);
    setTimeout(() => setBriefSaved(false), 2500);
    setEditingBrief(false);
    fetchData();
  };

  const handleMoveIdea = async (ideaId: string, newDate: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("pillar_ideas")
      .update({ scheduled_date: newDate })
      .eq("id", ideaId);
    if (error) {
      console.error("Error moving idea:", JSON.stringify(error, null, 2));
    } else {
      await fetchData();
    }
  };

  const downloadAllPieces = async () => {
    if (pieces.length === 0) return;
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const monthPrefix = format(currentMonth, "yyyy-MM");
      const monthPieces = pieces.filter((p) => p.scheduled_date?.startsWith(monthPrefix));

      const files = monthPieces.flatMap((p) => {
        const urls = [p.media_url, ...(p.media_additional || [])].filter(Boolean) as string[];
        return urls.map((url) => ({ url, title: p.title }));
      });

      await Promise.all(
        files.map(async ({ url, title }, i) => {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            const ext = url.match(/\.(mp4|webm|mov|avi|jpg|jpeg|png|gif|webp)$/i)?.[0] || "";
            const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
            zip.file(`${safeTitle}_${i + 1}${ext}`, blob);
          } catch {
            // skip failed files
          }
        })
      );

      if (Object.keys(zip.files).length === 0) return;
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `piezas-${monthPrefix}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silently fail
    } finally {
      setDownloadingAll(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const weekDays = language === "es"
    ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const statusColors: Record<IdeaStatus, string> = {
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    needs_revision: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const statusIcons: Record<IdeaStatus, React.ReactNode> = {
    approved: <HiCheckCircle size={14} />,
    needs_revision: <HiXCircle size={14} />,
    standby: <HiClock size={14} />,
    draft: <HiPencil size={14} />,
  };

  const pillarPalette = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ];

  const pieceTypeColors: Record<PieceType, string> = {
    carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    story: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    reel: "bg-red-500/20 text-red-400 border-red-500/30",
    post: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const [typeFilter, setTypeFilter] = useState<PieceType | "all">("all");

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold gradient-text">{t.pillars.title}</h1>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t.pillars.brief}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">
              {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
            </span>
            {!editingBrief && briefContent && (
              <button
                onClick={() => setEditingBrief(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-secondary)] hover:text-velion-cyan"
              >
                <HiPencil size={14} />
              </button>
            )}
          </div>
        </div>
        {editingBrief ? (
          <>
            <textarea
              value={briefContent}
              onChange={(e) => setBriefContent(e.target.value)}
              placeholder={t.pillars.noBrief}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 focus:ring-2 focus:ring-velion-cyan/20 transition-all resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-3">
              {briefSaved && (
                <span className="text-xs text-emerald-400 animate-fade-in">
                  {t.pillars.briefSaved}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setEditingBrief(false); fetchData(); }}>
                {t.calendar.cancel}
              </Button>
              <Button size="sm" onClick={saveBrief} disabled={savingBrief || !briefContent.trim()}>
                {savingBrief ? "..." : t.pillars.saveBrief}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <div className={`${briefContent ? "text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)] line-clamp-4" : "text-sm text-[var(--text-secondary)] italic"}`}>
              {briefContent || t.pillars.noBrief}
            </div>
            {briefContent && (
              <button
                onClick={() => setViewingBrief(true)}
                className="text-xs text-velion-cyan hover:text-velion-cyan/80 mt-2 transition-colors"
              >
                {t.pillars.expandBrief}
              </button>
            )}
          </div>
        )}
      </GlassCard>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Calendar</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <HiChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[140px] text-center select-none">
              {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <HiChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pieces.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={downloadAllPieces}
              disabled={downloadingAll}
            >
              <HiDownload size={14} className="inline mr-1" />
              {downloadingAll ? "..." : language === "es" ? "Descargar todo" : "Download all"}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditingIdea(null); setSelectedDate(""); setShowIdeaForm(true); }}>
            <HiPlus size={16} className="inline mr-1" />
            {t.pillars.addIdea}
          </Button>
        </div>
      </div>

      <GlassCard>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-[var(--text-secondary)] py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, idx) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayIdeas = ideas.filter((i) => i.scheduled_date === dateStr);
            const isCurrent = isSameMonth(day, currentMonth);

            return (
              <div
                key={idx}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const ideaId = e.dataTransfer.getData("text/plain");
                  if (ideaId) handleMoveIdea(ideaId, dateStr);
                }}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setEditingIdea(null);
                  setShowIdeaForm(true);
                }}
                className={`relative min-h-[65px] p-1.5 rounded-xl text-left transition-all duration-200 border cursor-pointer ${
                  isCurrent
                    ? "bg-white/5 border-transparent hover:bg-white/10"
                    : "bg-transparent border-transparent opacity-40"
                }`}
              >
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayIdeas.map((idea) => {
                    const linkedPiece = pieces.find((p) => p.pillar_idea_id === idea.id);
                    return (
                      <div
                        key={idea.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", idea.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingIdea(idea);
                        }}
                        className={`text-[11px] px-1.5 py-0.5 rounded-md border truncate flex items-center gap-1 cursor-grab active:cursor-grabbing ${pieceTypeColors[idea.type]}`}
                        title={`${idea.title} - ${(t.calendar.type as Record<string, string>)[idea.type]}`}
                      >
                        <span className="truncate flex-1">{idea.title}</span>
                        {linkedPiece && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setViewingPiece(linkedPiece);
                            }}
                            className={`shrink-0 p-0.5 rounded transition-colors ${
                              linkedPiece.status === "posted"
                                ? "bg-emerald-500/30 text-emerald-400"
                                : linkedPiece.status === "ready_to_post"
                                  ? "bg-amber-500/30 text-amber-400"
                                  : "hover:bg-white/20 text-velion-cyan"
                            }`}
                            title={language === "es" ? "Ver pieza" : "View piece"}
                          >
                            {linkedPiece.status === "posted" ? <HiCheckCircle size={10} /> : <HiPaperClip size={10} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {monthIdeas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              {monthIdeas.length} {language === "es" ? "ideas" : "ideas"}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTypeFilter("all")}
                className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                  typeFilter === "all"
                    ? "bg-velion-cyan/15 border-velion-cyan/40 text-velion-cyan"
                    : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                }`}
              >
                {t.pillars.allTypes}
              </button>
              {(Object.keys(pieceTypeColors) as PieceType[]).map((pt) => (
                <button
                  key={pt}
                  onClick={() => setTypeFilter(pt)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    typeFilter === pt
                      ? `${pieceTypeColors[pt]} shadow-sm`
                      : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                  }`}
                >
                  {(t.calendar.type as Record<string, string>)[pt]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthIdeas.filter((i) => typeFilter === "all" || i.type === typeFilter).map((idea) => (
              <GlassCard
                key={idea.id}
                className="!p-4 cursor-pointer border-l-4 hover:scale-[1.02] transition-all"
                style={{
                  borderLeftColor: {
                    approved: "#10b981",
                    needs_revision: "#f43f5e",
                    standby: "#f59e0b",
                    draft: "#71717a",
                  }[idea.status],
                }}
                onClick={() => setViewingIdea(idea)}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${
                    pieceTypeColors[idea.type]
                  }`}>
                    {(t.calendar.type as Record<string, string>)[idea.type]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${
                    pillarPalette[Math.abs(idea.pillar.length) % pillarPalette.length]
                  }`}>
                    {idea.pillar}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{idea.theme}</span>
                </div>
                <p className="text-sm font-medium">{idea.title}</p>
                {idea.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 whitespace-pre-wrap">{idea.description}</p>
                )}
                {idea.image_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingIdeaImageUrl(idea.image_url!);
                    }}
                    className="mt-2 w-full block"
                  >
                    <img src={idea.image_url} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                  </button>
                )}
                {(() => {
                  const linkedPiece = pieces.find((p) => p.pillar_idea_id === idea.id);
                  return linkedPiece ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingPiece(linkedPiece);
                      }}
                      className="mt-2 w-full block rounded-lg overflow-hidden border border-[var(--glass-border)] hover:border-velion-cyan/40 transition-all text-left"
                    >
                      {linkedPiece.media_url ? (
                        <img src={linkedPiece.media_url} alt={linkedPiece.title} className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center bg-white/5">
                          <HiPhotograph size={20} className="text-[var(--text-secondary)]/40" />
                        </div>
                      )}
                      <div className="p-2 flex items-center gap-2 bg-white/5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${pieceTypeColors[linkedPiece.type]}`}>
                          {(t.calendar.type as Record<string, string>)[linkedPiece.type]}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{linkedPiece.title}</span>
                        {(linkedPiece.media_additional?.length ?? 0) > 0 && (
                          <span className="text-[10px] text-[var(--text-secondary)]/60">
                            +{1 + (linkedPiece.media_additional?.length ?? 0)}
                          </span>
                        )}
                      </div>
                    </button>
                  ) : null;
                })()}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {idea.scheduled_date ? (
                      <p className="text-xs text-velion-cyan">
                        {format(parse(idea.scheduled_date, "yyyy-MM-dd", new Date()), "MMM d", { locale: dateLocale })}
                      </p>
                    ) : (
                      <span />
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    statusColors[idea.status]
                  }`}>
                    {statusIcons[idea.status]}
                    {t.pillars.statuses[idea.status]}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {viewingIdea && (
        <IdeaDetailModal
          idea={viewingIdea}
          onClose={() => setViewingIdea(null)}
          onEdit={() => {
            setEditingIdea(viewingIdea);
            setViewingIdea(null);
            setShowIdeaForm(true);
          }}
          onSaved={() => {
            fetchData();
            setViewingIdea(null);
          }}
          onRefresh={async () => {
            const ideasData = await fetchData();
            if (viewingIdea && ideasData) {
              const updated = ideasData.find((i) => i.id === viewingIdea.id);
              if (updated) setViewingIdea(updated);
            }
          }}
        />
      )}
      {viewingBrief && brief && (
        <BriefDetailModal
          brief={brief}
          onClose={() => setViewingBrief(false)}
        />
      )}
      {showIdeaForm && (
        <IdeaFormModal
          idea={editingIdea}
          defaultDate={selectedDate}
          onClose={() => { setShowIdeaForm(false); setEditingIdea(null); setSelectedDate(""); }}
          onSaved={() => { fetchData(); setShowIdeaForm(false); setEditingIdea(null); setSelectedDate(""); }}
        />
      )}
      {viewingPiece && (
        <PieceViewerModal
          piece={viewingPiece}
          onClose={() => setViewingPiece(null)}
          onUpdate={(updated) => { setViewingPiece(updated); fetchData(); }}
        />
      )}
      {viewingIdeaImageUrl && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200]" onClick={() => setViewingIdeaImageUrl(null)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img src={viewingIdeaImageUrl} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
                <button
                  onClick={() => setViewingIdeaImageUrl(null)}
                  className="absolute -top-3 -right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <HiXCircle size={24} />
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function IdeaDetailModal({
  idea,
  onClose,
  onEdit,
  onSaved,
  onRefresh,
}: {
  idea: PillarIdea;
  onClose: () => void;
  onEdit: () => void;
  onSaved: () => void;
  onRefresh: () => void;
}) {
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [deletingIdea, setDeletingIdea] = useState(false);
  const [showPieceForm, setShowPieceForm] = useState(false);
  const [pieceType, setPieceType] = useState<PieceType>("post");
  const [pieceStatus, setPieceStatus] = useState<PieceStatus>("pending");
  const [pieceTime, setPieceTime] = useState("12:00");
  const [pieceCaption, setPieceCaption] = useState("");
  const [pieceFiles, setPieceFiles] = useState<File[]>([]);
  const [piecePreviews, setPiecePreviews] = useState<string[]>([]);
  const [pieceSaving, setPieceSaving] = useState(false);
  const [pieceError, setPieceError] = useState<string | null>(null);
  const [viewingPieceInModal, setViewingPieceInModal] = useState<CalendarPiece | null>(null);
  const [viewingIdeaImage, setViewingIdeaImage] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [copyTexts, setCopyTexts] = useState<Record<string, string>>(idea.copy ?? {});
  const [activeCopyType, setActiveCopyType] = useState<PieceType>("post");
  const [copySaving, setCopySaving] = useState(false);
  const [copySaved, setCopySaved] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const dateLocale = language === "es" ? es : undefined;

  const statusColors: Record<IdeaStatus, string> = {
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    needs_revision: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const statusBars: Record<IdeaStatus, string> = {
    approved: "bg-emerald-500",
    needs_revision: "bg-rose-500",
    standby: "bg-amber-500",
    draft: "bg-zinc-500",
  };

  const statusIcons: Record<IdeaStatus, React.ReactNode> = {
    approved: <HiCheckCircle size={16} />,
    needs_revision: <HiXCircle size={16} />,
    standby: <HiClock size={16} />,
    draft: <HiPencil size={16} />,
  };

  const pillarPalette = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ];

  const pieceTypeColors: Record<PieceType, string> = {
    carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    story: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    reel: "bg-red-500/20 text-red-400 border-red-500/30",
    post: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const [linkedPieces, setLinkedPieces] = useState<CalendarPiece[]>([]);

  const fetchData = useCallback(async () => {
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
  }, [idea.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusSave = async () => {
    if (!user || status === idea.status) return;
    setSavingStatus(true);
    console.log("Saving status:", { status, ideaId: idea.id, userId: user.id });
    const { error } = await supabase
      .from("pillar_ideas")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", idea.id);
    setSavingStatus(false);
    if (error) {
      const msg = (error as any)?.message || JSON.stringify(error);
      console.error("Status save error:", msg, "details:", (error as any)?.details, "hint:", (error as any)?.hint);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 8000);
      return;
    }
    onRefresh();
  };

  const handleDeleteIdea = async () => {
    if (!user) return;
    setDeletingIdea(true);
    const { error } = await supabase.from("pillar_ideas").delete().eq("id", idea.id);
    setDeletingIdea(false);
    if (error) {
      setErrorMsg((error as any)?.message || JSON.stringify(error));
      setTimeout(() => setErrorMsg(null), 8000);
      return;
    }
    onClose();
    onRefresh();
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim()) return;
    setSendingComment(true);
    await supabase.from("idea_comments").insert({
      idea_id: idea.id,
      user_id: user.id,
      content: commentText.trim(),
    });
    setCommentText("");
    setSendingComment(false);
    fetchData();
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await supabase
      .from("idea_comments")
      .update({ content: editCommentText.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId);
    setEditingCommentId(null);
    setEditCommentText("");
    fetchData();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("idea_comments").delete().eq("id", commentId);
    setDeletingCommentId(null);
    fetchData();
  };

  const handleSavePiece = async () => {
    if (!user) return;
    setPieceSaving(true);
    setPieceError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of pieceFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("velion-py")
          .upload(fileName, file);
        if (uploadError) {
          setPieceError(`Upload error: ${uploadError.message}`);
          setPieceSaving(false);
          return;
        }
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("velion-py").getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        }
      }
      const pieceData: Record<string, any> = {
        user_id: user.id,
        title: idea.title,
        type: pieceType,
        status: pieceStatus,
        scheduled_date: idea.scheduled_date || format(new Date(), "yyyy-MM-dd"),
        scheduled_time: pieceTime,
        caption: pieceCaption.trim() || null,
        media_url: uploadedUrls[0] || null,
        media_additional: uploadedUrls.slice(1),
        pillar_idea_id: idea.id,
      };
      const { error } = await supabase.from("calendar_pieces").insert(pieceData);
      if (error) {
        setPieceError(`Save error: ${error.message}`);
        setPieceSaving(false);
        return;
      }
      setShowPieceForm(false);
      setPieceFiles([]);
      setPiecePreviews([]);
      setPieceType("post");
      setPieceStatus("pending");
      setPieceTime("12:00");
      setPieceCaption("");
      fetchData();
    } catch (err: any) {
      setPieceError(err?.message || "Unknown error");
    }
    setPieceSaving(false);
  };

  const handleDeletePiece = async (pieceId: string) => {
    if (!user) return;
    await supabase.from("calendar_pieces").delete().eq("id", pieceId);
    fetchData();
  };

  const cyclePieceStatus = async (piece: CalendarPiece) => {
    if (!user) return;
    const next: Record<PieceStatus, PieceStatus> = {
      pending: "ready_to_post",
      ready_to_post: "posted",
      posted: "pending",
    };
    const newStatus = next[piece.status];
    await supabase
      .from("calendar_pieces")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", piece.id);
    fetchData();
  };

  const handleSaveCopy = async () => {
    if (!user) return;
    setCopySaving(true);
    setCopySaved(false);
    const { error } = await supabase
      .from("pillar_ideas")
      .update({ copy: copyTexts, updated_at: new Date().toISOString() })
      .eq("id", idea.id);
    setCopySaving(false);
    if (!error) {
      setCopySaved(true);
      setTimeout(() => setCopySaved(false), 2500);
      onRefresh();
    }
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

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          className="w-full sm:w-[85vw] lg:w-[80vw] h-[90vh] sm:h-[85vh] flex flex-col animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`h-2 rounded-t-2xl ${statusBars[status]}`} />

        {errorMsg && (
          <div className="bg-rose-500/20 text-rose-300 text-xs px-4 py-2 border-b border-rose-500/20 flex items-center gap-2">
            <HiXCircle size={14} className="shrink-0" />
            <span className="font-mono break-all">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto shrink-0 hover:text-white">
              <HiXCircle size={14} />
            </button>
          </div>
        )}

        <div className="glass-card !rounded-t-none flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto border-r border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <HiLightBulb className="text-velion-cyan shrink-0" />
                {idea.title}
              </h3>
              <div className="flex items-center gap-2">
                {confirmDeleting ? (
                  <>
                    <button
                      onClick={handleDeleteIdea}
                      disabled={deletingIdea}
                      className="text-xs px-3 py-1.5 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-medium transition-all"
                    >
                      {deletingIdea ? "..." : t.calendar.delete}
                    </button>
                    <button
                      onClick={() => setConfirmDeleting(false)}
                      className="text-xs px-3 py-1.5 rounded-md text-[var(--text-secondary)] hover:bg-white/10 transition-all"
                    >
                      {t.calendar.cancel}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleting(true)}
                    className="p-2 rounded-lg hover:bg-rose-500/15 transition-colors text-[var(--text-secondary)] hover:text-rose-400"
                    title={t.calendar.delete}
                  >
                    <HiTrash size={16} />
                  </button>
                )}
                <Button size="sm" variant="secondary" onClick={onEdit}>
                  <HiPencil size={14} className="inline mr-1" />
                  {t.pillars.edit}
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm px-3 py-1 rounded-md border font-medium ${
                  pieceTypeColors[idea.type]
                }`}>
                  {(t.calendar.type as Record<string, string>)[idea.type]}
                </span>
                <span className={`text-sm px-3 py-1 rounded-md border font-medium ${
                  pillarPalette[Math.abs(idea.pillar.length) % pillarPalette.length]
                }`}>
                  {idea.pillar}
                </span>
                <span className="text-sm text-[var(--text-secondary)] font-medium">{idea.theme}</span>
              </div>

              {idea.description && (
                <div className="border border-[var(--glass-border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold hover:bg-white/5 transition-colors"
                  >
                    <span>{t.pillars.ideaDescription}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      className={`transition-transform duration-200 ${showDescription ? "rotate-180" : ""}`}
                    >
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
                  <button onClick={() => setViewingIdeaImage(true)} className="w-full block">
                    <img src={idea.image_url} alt="" className="w-full rounded-xl max-h-64 object-cover hover:opacity-80 transition-opacity" />
                  </button>
                </div>
              )}

              {idea.scheduled_date && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider font-semibold">{t.pillars.schedule}</p>
                  <p className="text-[15px] font-medium text-velion-cyan">
                    {format(parse(idea.scheduled_date, "yyyy-MM-dd", new Date()), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                  </p>
                </div>
              )}

              <div className="border border-[var(--glass-border)] rounded-xl p-4 space-y-3">
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">{t.pillars.copy}</p>
                <div className="flex gap-2 flex-wrap">
                  {(["post", "reel", "story", "carousel"] as PieceType[]).map((pt) => (
                    <button
                      key={pt}
                      onClick={() => setActiveCopyType(pt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        activeCopyType === pt
                          ? `${pieceTypeColors[pt]} shadow-sm border-current`
                          : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                      }`}
                    >
                      {(t.calendar.type as Record<string, string>)[pt]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={copyTexts[activeCopyType] ?? ""}
                  onChange={(e) => setCopyTexts(prev => ({ ...prev, [activeCopyType]: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 resize-none"
                  placeholder={t.pillars.copyPlaceholder}
                />
                <div className="flex items-center justify-end gap-2">
                  {copySaved && (
                    <span className="text-xs text-emerald-400 animate-fade-in">{t.pillars.copySaved}</span>
                  )}
                  <Button size="sm" onClick={handleSaveCopy} disabled={copySaving}>
                    {copySaving ? "..." : t.pillars.copySave}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                    {language === "es" ? "Pieza gráfica" : "Graphic piece"}
                  </p>
                  {linkedPieces.length === 0 && !showPieceForm && (
                    <button
                      onClick={() => {
                        setPieceType(idea.type);
                        setPieceTime("12:00");
                        setPieceCaption("");
                        setPieceFiles([]);
                        setPiecePreviews([]);
                        setShowPieceForm(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-velion-cyan/15 border border-velion-cyan/30 text-velion-cyan hover:bg-velion-cyan/25 transition-all font-medium"
                    >
                      <HiPlus size={12} className="inline mr-1" />
                      {language === "es" ? "Adjuntar pieza" : "Attach piece"}
                    </button>
                  )}
                </div>

                {linkedPieces.map((p) => (
                  <div key={p.id} className={`rounded-xl border overflow-hidden mb-3 last:mb-0 relative transition-all ${
                    p.status === "posted"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : p.status === "ready_to_post"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/5 border-[var(--glass-border)]"
                  }`}>
                    <div
                      onClick={() => setViewingPieceInModal(p)}
                      className={`w-full block text-left cursor-pointer ${p.status === "posted" ? "blur-sm" : ""}`}
                    >
                      {p.media_url ? (
                        p.media_url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                          <video src={p.media_url} className="w-full max-h-64 object-cover" controls />
                        ) : (
                          <>
                            <img
                              src={p.media_url}
                              alt={p.title}
                              className="w-full max-h-64 object-cover"
                              onError={(e) => {
                                const t = e.target as HTMLImageElement;
                                t.style.display = "none";
                                const n = t.nextElementSibling as HTMLElement | null;
                                if (n) n.style.display = "flex";
                              }}
                              onLoad={(e) => {
                                const t = e.target as HTMLImageElement;
                                t.style.display = "";
                                const n = t.nextElementSibling as HTMLElement | null;
                                if (n) n.style.display = "none";
                              }}
                            />
                            <div className="w-full h-32 items-center justify-center bg-white/5 hidden flex-col gap-1">
                              <HiPhotograph size={24} className="text-rose-400/60" />
                              <span className="text-xs text-rose-400/60">Error al cargar</span>
                            </div>
                          </>
                        )
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-white/5">
                          <HiPhotograph size={32} className="text-[var(--text-secondary)]/40" />
                        </div>
                      )}
                      {(p.media_additional?.length ?? 0) > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white">
                            +{p.media_additional!.length + 1}
                          </span>
                        </div>
                      )}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${pieceTypeColors[p.type]}`}>
                            {(t.calendar.type as Record<string, string>)[p.type]}
                          </span>
                          <span className="text-sm font-medium flex-1 truncate">{p.title}</span>
                          {p.media_url && (
                            <a
                              href={p.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-velion-cyan/15 text-[var(--text-secondary)] hover:text-velion-cyan transition-colors shrink-0 cursor-pointer"
                              title={language === "es" ? "Descargar" : "Download"}
                            >
                              <HiDownload size={14} />
                            </a>
                          )}
                          <span
                            onClick={(e) => { e.stopPropagation(); handleDeletePiece(p.id); }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--text-secondary)] hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                            title={t.calendar.delete}
                          >
                            <HiTrash size={14} />
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {format(parse(p.scheduled_date + "T00:00:00", "yyyy-MM-dd'T'HH:mm:ss", new Date()), "MMM d", { locale: dateLocale })} {p.scheduled_time}
                        </p>
                        {p.caption && <p className="text-xs text-[var(--text-secondary)]/70">{p.caption}</p>}
                        <span className="text-xs text-velion-cyan font-medium inline-block">
                          {language === "es" ? "Ver pieza" : "View piece"}
                        </span>
                      </div>
                    </div>
                    {p.status === "posted" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <HiCheckCircle size={28} className="text-white" />
                        </div>
                      </div>
                    )}
                    {p.status === "ready_to_post" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="px-3 py-1.5 rounded-full bg-amber-500/90 flex items-center gap-1.5 shadow-lg shadow-amber-500/30">
                          <HiClock size={16} className="text-white" />
                          <span className="text-xs font-semibold text-white">{language === "es" ? "Listo para postear" : "Ready to post"}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); cyclePieceStatus(p); }}
                        className={`p-1.5 rounded-lg backdrop-blur-md transition-colors cursor-pointer ${
                          p.status === "posted"
                            ? "bg-emerald-500/80 text-white hover:bg-emerald-500"
                            : p.status === "ready_to_post"
                              ? "bg-amber-500/80 text-white hover:bg-amber-500"
                              : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
                        }`}
                        title={language === "es" ? "Cambiar estado" : "Change status"}
                      >
                        {p.status === "posted" ? <HiCheckCircle size={14} /> : <HiClock size={14} />}
                      </button>
                    </div>
                  </div>
                ))}

                {linkedPieces.length === 0 && showPieceForm && (
                  <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.pieceType}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["carousel", "story", "reel", "post"] as PieceType[]).map((pt) => (
                          <button
                            key={pt}
                            onClick={() => setPieceType(pt)}
                            className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                              pieceType === pt
                                ? `${pieceTypeColors[pt]} shadow-sm border-current`
                                : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                            }`}
                          >
                            {(t.calendar.type as Record<string, string>)[pt]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.calendar.pieceStatus}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["pending", "ready_to_post", "posted"] as PieceStatus[]).map((ps) => {
                          const statusStyles: Record<PieceStatus, string> = {
                            pending: pieceStatus === ps ? "bg-white/15 border-white/30 text-[var(--text-primary)]" : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10",
                            ready_to_post: pieceStatus === ps ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10",
                            posted: pieceStatus === ps ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10",
                          };
                          return (
                            <button
                              key={ps}
                              onClick={() => setPieceStatus(ps)}
                              className={`py-2 rounded-lg text-xs font-medium border transition-all ${statusStyles[ps]}`}
                            >
                              {(t.calendar.pieceStatuses as Record<string, string>)[ps]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.calendar.time}</label>
                      <input
                        type="time"
                        value={pieceTime}
                        onChange={(e) => setPieceTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.calendar.caption}</label>
                      <textarea
                        value={pieceCaption}
                        onChange={(e) => setPieceCaption(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.calendar.upload} ({language === "es" ? "varios archivos" : "multiple files"})</label>
                      <div
                        onClick={() => document.getElementById("piece-media")?.click()}
                        className="border-2 border-dashed border-[var(--glass-border)] rounded-lg p-3 text-center cursor-pointer hover:border-velion-cyan/40 transition-colors"
                      >
                        {piecePreviews.length > 0 ? (
                          <div className="space-y-1.5">
                            {piecePreviews.map((url, i) => (
                              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-[var(--glass-border)]">
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] w-4 text-center shrink-0">{i + 1}</span>
                                <img src={url} alt="" className="h-10 w-10 object-cover rounded-md shrink-0" />
                                <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{pieceFiles[i]?.name}</span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (i > 0) { const f = [...pieceFiles]; const p = [...piecePreviews]; [f[i-1], f[i]] = [f[i], f[i-1]]; [p[i-1], p[i]] = [p[i], p[i-1]]; setPieceFiles(f); setPiecePreviews(p); } }}
                                    disabled={i === 0}
                                    className="p-0.5 rounded hover:bg-white/10 text-[var(--text-secondary)] disabled:opacity-20"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (i < piecePreviews.length - 1) { const f = [...pieceFiles]; const p = [...piecePreviews]; [f[i], f[i+1]] = [f[i+1], f[i]]; [p[i], p[i+1]] = [p[i+1], p[i]]; setPieceFiles(f); setPiecePreviews(p); } }}
                                    disabled={i === piecePreviews.length - 1}
                                    className="p-0.5 rounded hover:bg-white/10 text-[var(--text-secondary)] disabled:opacity-20"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPieceFiles(prev => prev.filter((_, j) => j !== i)); setPiecePreviews(prev => prev.filter((_, j) => j !== i)); }}
                                    className="p-0.5 rounded hover:bg-rose-500/15 text-rose-400"
                                  >
                                    <HiXCircle size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[var(--text-secondary)] text-xs">
                            <HiPhotograph size={20} className="mx-auto mb-1 opacity-50" />
                            {t.calendar.dropHere}
                          </div>
                        )}
                        <input
                          id="piece-media"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setPieceFiles(prev => [...prev, ...files]);
                              setPiecePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                            }
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setShowPieceForm(false); setPieceFiles([]); setPiecePreviews([]); setPieceError(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-white/10 transition-all"
                      >
                        {t.calendar.cancel}
                      </button>
                      <Button size="sm" onClick={handleSavePiece} disabled={pieceSaving}>
                        {pieceSaving ? "..." : t.calendar.save}
                      </Button>
                    </div>
                    {pieceError && (
                      <p className="text-xs text-rose-400 mt-1">{pieceError}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">{t.pillars.status}</label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(t.pillars.statuses) as IdeaStatus[]).map((s) => {
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`relative py-3.5 px-4 rounded-xl text-sm font-medium border transition-all flex items-center gap-2.5 ${
                          isActive
                            ? `${statusColors[s]} shadow-lg border-current`
                            : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                        }`}
                      >
                        {statusIcons[s]}
                        <span>{t.pillars.statuses[s]}</span>
                        {isActive && (
                          <span className="ml-auto text-xs opacity-60">Γ£ô</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {status !== idea.status && (
                  <div className="flex justify-end mt-3">
                    <Button size="sm" onClick={handleStatusSave} disabled={savingStatus}>
                      {savingStatus ? "..." : t.pillars.saveBrief}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col">
            <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <HiChat size={18} className="text-velion-cyan" />
                {t.pillars.comments}
                <span className="text-sm text-[var(--text-secondary)] font-normal">
                  ({comments.length})
                </span>
              </h4>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Close"
              >
                <HiXCircle size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[400px]">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  <HiChat size={32} className="mx-auto mb-2 opacity-30" />
                  <p>{t.pillars.noIdeas}</p>
                </div>
              ) : (
                comments.map((c) => {
                  const isMine = c.user_id === user?.id;
                  const profile = profilesMap[c.user_id];
                  const name = profile
                    ? `${profile.first_name} ${profile.last_name}`.trim() || "ΓÇö"
                    : "ΓÇö";
                  const initials = profile
                    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() || "?"
                    : "?";
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(c.created_at).getTime();
                    if (diff < 60000) return t.pillars.justNow;
                    return formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    });
                  })();
                  const wasEdited = c.updated_at !== c.created_at;

                  return (
                    <div key={c.id} className="animate-fade-in">
                      <div className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                          isMine
                            ? "bg-velion-cyan/20 text-velion-cyan"
                            : "bg-white/10 text-[var(--text-secondary)]"
                        }`}>
                          {initials}
                        </div>
                        <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[80%]`}>
                          <span className="text-xs text-[var(--text-secondary)] mb-0.5 px-1 font-medium">
                            {name}
                          </span>
                          <div
                            className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed w-full ${
                              isMine
                                ? "bg-velion-cyan/15 text-velion-cyan border border-velion-cyan/20 rounded-br-md"
                                : "bg-white/10 text-[var(--text-primary)] border border-[var(--glass-border)] rounded-bl-md"
                            }`}
                          >
                            {editingCommentId === c.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => { setEditingCommentId(null); setEditCommentText(""); }}
                                    className="text-xs px-3 py-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10"
                                  >
                                    {t.calendar.cancel}
                                  </button>
                                  <button
                                    onClick={() => handleEditComment(c.id)}
                                    className="text-xs px-3 py-1 rounded-md bg-velion-cyan/20 text-velion-cyan hover:bg-velion-cyan/30 font-medium"
                                  >
                                    {t.pillars.saveBrief}
                                  </button>
                                </div>
                              </div>
                            ) : deletingCommentId === c.id ? (
                              <div className="space-y-2">
                                <p className="text-sm">{t.pillars.deleteConfirm}</p>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setDeletingCommentId(null)}
                                    className="text-xs px-3 py-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10"
                                  >
                                    {t.calendar.cancel}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-xs px-3 py-1 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-medium"
                                  >
                                    {t.calendar.delete}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{c.content}</p>
                                <div className={`flex items-center justify-between mt-2 ${isMine ? "flex-row-reverse" : ""}`}>
                                  <p className={`text-xs ${isMine ? "text-velion-cyan/60" : "text-[var(--text-secondary)]"}`}>
                                    {timeAgo}
                                    {wasEdited && " ┬╖ edited"}
                                  </p>
                                  {isMine && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                                        className="text-xs p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100"
                                        title={t.pillars.editComment}
                                      >
                                        <HiPencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => setDeletingCommentId(c.id)}
                                        className="text-xs p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100"
                                        title={t.calendar.delete}
                                      >
                                        <HiXCircle size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-[var(--glass-border)]">
              <div className="flex items-end gap-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t.pillars.commentPlaceholder}
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-[15px] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !commentText.trim()}
                  className="p-3 rounded-xl bg-gradient-to-r from-velion-blue to-[#01308a] text-white disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-velion-blue/20 active:scale-95"
                >
                  <HiPaperAirplane size={18} className={sendingComment ? "animate-pulse" : ""} />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      {viewingPieceInModal && (
        <PieceViewerModal
          piece={viewingPieceInModal}
          onClose={() => setViewingPieceInModal(null)}
          onUpdate={(updated) => { setViewingPieceInModal(updated); fetchData(); }}
        />
      )}
      {viewingIdeaImage && idea.image_url && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200]" onClick={() => setViewingIdeaImage(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img src={idea.image_url} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
                <button
                  onClick={() => setViewingIdeaImage(false)}
                  className="absolute -top-3 -right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <HiXCircle size={24} />
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  </ModalPortal>
  );
}

function BriefDetailModal({
  brief,
  onClose,
}: {
  brief: MonthlyBrief;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<BriefCommentWithProfile[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const dateLocale = language === "es" ? es : undefined;

  const fetchComments = useCallback(async () => {
    const [commentsRes, profilesRes] = await Promise.all([
      supabase
        .from("brief_comments")
        .select("*")
        .eq("brief_id", brief.id)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, first_name, last_name, avatar_url"),
    ]);
    if (profilesRes.data) {
      const profileMap = Object.fromEntries(
        (profilesRes.data as Profile[]).map((p) => [p.id, p])
      );
      if (commentsRes.data) {
        setComments(
          commentsRes.data.map((c) => ({
            ...c,
            profile: profileMap[c.user_id] ?? { first_name: "?", last_name: "", avatar_url: null },
          }))
        );
      }
    }
  }, [brief.id, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const handleSendComment = async () => {
    if (!user || !commentText.trim()) return;
    setSendingComment(true);
    const { error } = await supabase.from("brief_comments").insert({
      brief_id: brief.id,
      user_id: user.id,
      content: commentText.trim(),
    });
    setSendingComment(false);
    if (!error) {
      setCommentText("");
      fetchComments();
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase
      .from("brief_comments")
      .update({ content: editText.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!error) {
      setEditingCommentId(null);
      setEditText("");
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("brief_comments").delete().eq("id", commentId);
    setDeletingCommentId(null);
    fetchComments();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
          <div
            className="w-full sm:w-[85vw] lg:w-[80vw] h-[90vh] sm:h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 rounded-t-2xl bg-gradient-to-r from-velion-cyan to-velion-blue" />

            <div className="glass-card !rounded-t-none flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto border-r border-[var(--glass-border)]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <HiLightBulb className="text-velion-cyan shrink-0" />
                    {t.pillars.brief}
                  </h3>
                </div>

                <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
                  {brief.content}
                </div>
              </div>

              <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <HiChat size={18} className="text-velion-cyan" />
                    {t.pillars.comments}
                    <span className="text-sm text-[var(--text-secondary)] font-normal">
                      ({comments.length})
                    </span>
                  </h4>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title="Close"
                  >
                    <HiXCircle size={22} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[400px]">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                      <HiChat size={32} className="mx-auto mb-2 opacity-30" />
                      <p>{t.pillars.noIdeas}</p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isMine = c.user_id === user?.id;
                      const name = c.profile
                        ? `${c.profile.first_name} ${c.profile.last_name}`.trim() || "ΓÇö"
                        : "ΓÇö";
                      const initials = c.profile
                        ? `${c.profile.first_name.charAt(0)}${c.profile.last_name.charAt(0)}`.toUpperCase() || "?"
                        : "?";
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(c.created_at).getTime();
                        if (diff < 60000) return t.pillars.justNow;
                        return formatDistanceToNow(new Date(c.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        });
                      })();
                      const wasEdited = c.updated_at !== c.created_at;

                      return (
                        <div key={c.id} className="animate-fade-in">
                          <div className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                              isMine
                                ? "bg-velion-cyan/20 text-velion-cyan"
                                : "bg-white/10 text-[var(--text-secondary)]"
                            }`}>
                              {initials}
                            </div>
                            <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[80%]`}>
                              <span className="text-xs text-[var(--text-secondary)] mb-0.5 px-1 font-medium">
                                {name}
                              </span>
                              {editingCommentId === c.id ? (
                                <div className="w-full space-y-2">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={() => { setEditingCommentId(null); setEditText(""); }}
                                      className="text-xs px-2 py-1 rounded text-[var(--text-secondary)] hover:bg-white/10"
                                    >
                                      {t.calendar.cancel}
                                    </button>
                                    <Button size="sm" onClick={() => handleEditComment(c.id)}>
                                      {t.pillars.saveBrief}
                                    </Button>
                                  </div>
                                </div>
                              ) : deletingCommentId === c.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-secondary)]">{t.pillars.deleteConfirm}</span>
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                  >
                                    {t.calendar.delete}
                                  </button>
                                  <button
                                    onClick={() => setDeletingCommentId(null)}
                                    className="text-xs px-2 py-1 rounded text-[var(--text-secondary)] hover:bg-white/10"
                                  >
                                    {t.calendar.cancel}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed w-full ${
                                    isMine
                                      ? "bg-velion-cyan/15 text-velion-cyan border border-velion-cyan/20 rounded-br-md"
                                      : "bg-white/10 text-[var(--text-primary)] border border-[var(--glass-border)] rounded-bl-md"
                                  }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{c.content}</p>
                                    <div className={`flex items-center justify-between mt-2 ${isMine ? "flex-row-reverse" : ""}`}>
                                      <p className={`text-xs ${isMine ? "text-velion-cyan/60" : "text-[var(--text-secondary)]"}`}>
                                        {timeAgo}
                                        {wasEdited && " ┬╖ edited"}
                                      </p>
                                      {isMine && (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => { setEditingCommentId(c.id); setEditText(c.content); }}
                                            className="text-xs p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100"
                                          >
                                            <HiPencil size={14} />
                                          </button>
                                          <button
                                            onClick={() => setDeletingCommentId(c.id)}
                                            className="text-xs p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100"
                                            title={t.calendar.delete}
                                          >
                                            <HiXCircle size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t.pillars.commentPlaceholder}
                      rows={1}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-[15px] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-velion-cyan/50 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendComment}
                      disabled={sendingComment || !commentText.trim()}
                      className="p-3 rounded-xl bg-gradient-to-r from-velion-blue to-[#01308a] text-white disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-velion-blue/20 active:scale-95"
                    >
                      <HiPaperAirplane size={18} className={sendingComment ? "animate-pulse" : ""} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </ModalPortal>
  );
}

export default function PillarsPage() {
  return (
    <Suspense fallback={<div className="animate-fade-in space-y-6"><div className="h-8 shimmer w-48 rounded-xl" /><div className="h-32 shimmer rounded-2xl" /><div className="grid grid-cols-7 gap-1"><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /><div className="h-24 shimmer rounded-xl" /></div></div>}>
      <PillarsContent />
    </Suspense>
  );
}


function IdeaFormModal({
  idea,
  defaultDate,
  onClose,
  onSaved,
}: {
  idea: PillarIdea | null;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [pillar, setPillar] = useState(idea?.pillar ?? "");
  const [theme, setTheme] = useState(idea?.theme ?? "");
  const [type, setType] = useState<PieceType>(idea?.type ?? "post");
  const [status, setStatus] = useState<IdeaStatus>(idea?.status ?? "draft");
  const [scheduledDate, setScheduledDate] = useState(idea?.scheduled_date ?? defaultDate ?? "");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    let imageUrl = idea?.image_url ?? null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const fileName = `idea-images/${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("velion-py")
        .upload(fileName, imageFile);
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("velion-py").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const ideaData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      pillar: pillar.trim() || "General",
      theme: theme.trim() || "General",
      type,
      status,
      scheduled_date: scheduledDate || null,
      image_url: imageUrl,
    };

    let error;
    if (idea) {
      const res = await supabase.from("pillar_ideas").update(ideaData).eq("id", idea.id);
      error = res.error;
    } else {
      const res = await supabase.from("pillar_ideas").insert(ideaData);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      console.error("Idea save error:", JSON.stringify(error, null, 2), "details:", (error as any)?.details, "hint:", (error as any)?.hint, "message:", (error as any)?.message);
      return;
    }
    onSaved();
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

  const statusColors: Record<IdeaStatus, string> = {
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    needs_revision: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const pieceTypeColors: Record<PieceType, string> = {
    carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    story: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    reel: "bg-red-500/20 text-red-400 border-red-500/30",
    post: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HiLightBulb className="text-velion-cyan" />
            {idea ? t.pillars.editIdea : t.pillars.addIdea}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Close"
          >
            <HiXCircle size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.pillar}</label>
              <input
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                placeholder={language === "es" ? "Ej. Educación" : "e.g. Education"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.theme}</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
                placeholder={language === "es" ? "Ej. Tips" : "e.g. Tips"}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.ideaTitle}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
              placeholder={language === "es" ? "Título de la idea" : "Idea title"}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.ideaDescription}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.pieceType}</label>
            <div className="grid grid-cols-5 gap-2">
              {(["carousel", "story", "reel", "post"] as PieceType[]).map((pt) => (
                <button
                  key={pt}
                  onClick={() => setType(pt)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                    type === pt
                      ? `${pieceTypeColors[pt]} shadow-lg border-current`
                      : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                  }`}
                >
                  {(t.calendar.type as Record<string, string>)[pt]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.status}</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(t.pillars.statuses) as IdeaStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
                    status === s
                      ? `${statusColors[s]} shadow-lg`
                      : "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
                  }`}
                >
                  {t.pillars.statuses[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t.pillars.schedule}</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{language === "es" ? "Imagen adjunta" : "Attached image"}</label>
            <div
              onClick={() => document.getElementById("idea-image")?.click()}
              className="border-2 border-dashed border-[var(--glass-border)] rounded-xl p-4 text-center cursor-pointer hover:border-velion-cyan/40 transition-colors"
            >
              {imagePreview || idea?.image_url ? (
                <img
                  src={imagePreview ?? idea?.image_url ?? ""}
                  alt="Preview"
                  className="max-h-32 mx-auto rounded-lg"
                />
              ) : (
                <div className="text-[var(--text-secondary)] text-xs">
                  <HiPhotograph size={24} className="mx-auto mb-1.5 opacity-50" />
                  {t.calendar.dropHere}
                </div>
              )}
              <input
                id="idea-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="hidden"
              />
            </div>
            {(imagePreview || idea?.image_url) && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-xs text-rose-400 hover:text-rose-300 mt-1.5 transition-colors"
              >
                {t.calendar.delete}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t.calendar.cancel}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "..." : t.pillars.saveBrief}
          </Button>
        </div>
      </div>
      </div>
    </div>
  </ModalPortal>
  );
}
