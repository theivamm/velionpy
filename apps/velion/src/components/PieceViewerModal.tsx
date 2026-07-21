"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HiXCircle, HiPaperAirplane, HiChat, HiTrash, HiPencil, HiPhotograph, HiDownload, HiCheckCircle, HiClock } from "react-icons/hi";
import { useLanguage, useAuth, createClient, ModalPortal, Button } from "@velion/shared";
import type { CalendarPiece, PieceStatus, PieceCommentWithProfile, Profile } from "@velion/shared/types";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export function PieceViewerModal({
  piece: initialPiece,
  onClose,
  onUpdate,
}: {
  piece: CalendarPiece;
  onClose: () => void;
  onUpdate?: (piece: CalendarPiece) => void;
}) {
  const [piece, setPiece] = useState(initialPiece);
  const [comments, setComments] = useState<PieceCommentWithProfile[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const dateLocale = language === "es" ? es : undefined;

  useEffect(() => {
    setIsVideo(!!piece.media_url && /\.(mp4|webm|mov|avi)$/i.test(piece.media_url));
  }, [piece.media_url]);

  const fetchComments = useCallback(async () => {
    const [commentsRes, profilesRes] = await Promise.all([
      supabase
        .from("piece_comments")
        .select("*")
        .eq("piece_id", piece.id)
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
  }, [piece.id, supabase]);

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

  useEffect(() => {
    if (!selectedComment || !commentsListRef.current) return;
    const el = commentsListRef.current.querySelector(`[data-comment-id="${selectedComment}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedComment]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setClickPos({ x, y });
    setCommentText("");
    setSelectedComment(null);
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim() || !clickPos) return;
    setSendingComment(true);
    const { error } = await supabase.from("piece_comments").insert({
      piece_id: piece.id,
      user_id: user.id,
      content: commentText.trim(),
      x_pos: clickPos.x,
      y_pos: clickPos.y,
    });
    setSendingComment(false);
    if (!error) {
      setCommentText("");
      setClickPos(null);
      fetchComments();
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    await supabase
      .from("piece_comments")
      .update({ content: editText.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId);
    setEditingCommentId(null);
    setEditText("");
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("piece_comments").delete().eq("id", commentId);
    setDeletingCommentId(null);
    fetchComments();
  };

  const markerSize = 24;
  const isImage = piece.media_url && !isVideo;

  const cycleStatus = async () => {
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
    const updated = { ...piece, status: newStatus };
    setPiece(updated);
    onUpdate?.(updated);
  };
  const allMedia: string[] = [piece.media_url, ...(piece.media_additional || [])].filter(Boolean) as string[];
  const currentMedia = allMedia[currentIndex] || "";

  const handlePrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : allMedia.length - 1));
  const handleNext = () => setCurrentIndex((i) => (i < allMedia.length - 1 ? i + 1 : 0));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
          <div
            className="w-full sm:w-[90vw] lg:w-[85vw] max-w-6xl h-[90vh] sm:h-[88vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 rounded-t-2xl bg-gradient-to-r from-velion-cyan to-velion-blue" />
            <div className="glass-card !rounded-t-none flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <h3 className="text-base font-semibold truncate flex items-center gap-2">
                    <HiPhotograph className="text-velion-cyan shrink-0" size={18} />
                    {piece.title}
                    {piece.status === "posted" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1 shrink-0">
                        <HiCheckCircle size={10} /> {language === "es" ? "Posteado" : "Posted"}
                      </span>
                    )}
                    {piece.status === "ready_to_post" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1 shrink-0">
                        <HiClock size={10} /> {language === "es" ? "Listo para postear" : "Ready to post"}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cycleStatus}
                      className={`p-1.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 ${
                        piece.status === "posted"
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : piece.status === "ready_to_post"
                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            : "bg-white/10 text-[var(--text-secondary)] hover:bg-white/15"
                      }`}
                      title={language === "es" ? "Cambiar estado" : "Change status"}
                    >
                      {piece.status === "posted" ? <HiCheckCircle size={16} /> : <HiClock size={16} />}
                      <span className="text-xs">
                        {(t.calendar.pieceStatuses as Record<string, string>)[piece.status]}
                      </span>
                    </button>
                    {currentMedia && (
                      <a
                        href={currentMedia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-velion-cyan"
                        title={language === "es" ? "Descargar" : "Download"}
                      >
                        <HiDownload size={20} />
                      </a>
                    )}
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <HiXCircle size={22} />
                    </button>
                  </div>
                </div>
                <div
                  ref={imageRef}
                  className="flex-1 relative overflow-hidden bg-black/40 flex items-center justify-center cursor-crosshair"
                  onClick={handleImageClick}
                >
                  {currentMedia ? (
                    currentMedia.match(/\.(mp4|webm|mov|avi)$/i) ? (
                      <video
                        src={currentMedia}
                        controls
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <img
                        src={currentMedia}
                        alt={piece.title}
                        className="max-w-full max-h-full object-contain select-none"
                        draggable={false}
                      />
                    )
                  ) : (
                    <div className="text-center text-[var(--text-secondary)]">
                      <HiPhotograph size={48} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{language === "es" ? "Sin media" : "No media"}</p>
                    </div>
                  )}

                  {allMedia.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-30"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-30"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
                        {allMedia.map((_, i) => (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                            className={`w-2 h-2 rounded-full transition-all ${
                              i === currentIndex ? "bg-velion-cyan w-4" : "bg-white/40 hover:bg-white/60"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-3 right-3 z-30 text-xs px-2 py-1 rounded-md bg-black/60 text-white/80">
                        {currentIndex + 1} / {allMedia.length}
                      </div>
                    </>
                  )}

                  {comments.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComment(selectedComment === c.id ? null : c.id);
                        setClickPos(null);
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                      style={{ left: `${c.x_pos}%`, top: `${c.y_pos}%` }}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-200 ${
                        selectedComment === c.id
                          ? "bg-velion-cyan border-white scale-125 shadow-lg shadow-velion-cyan/50 ring-2 ring-velion-cyan/40"
                          : "bg-velion-cyan/80 border-white/70 hover:scale-110"
                      }`}>
                        {c.profile
                          ? `${c.profile.first_name.charAt(0)}${c.profile.last_name.charAt(0)}`.toUpperCase()
                          : "?"}
                      </div>
                    </button>
                  ))}

                  {clickPos && (
                    <div
                      className="absolute z-20"
                      style={{ left: `${clickPos.x}%`, top: `${clickPos.y}%` }}
                    >
                      <div className="animate-fade-in bg-black/80 backdrop-blur-md rounded-xl p-3 border border-white/20 w-64 -translate-x-1/2 -translate-y-1/2">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={language === "es" ? "Agregar comentario..." : "Add comment..."}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder-white/40 focus:outline-none focus:border-velion-cyan/50 resize-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment();
                            }
                          }}
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            onClick={() => setClickPos(null)}
                            className="text-xs px-2 py-1 rounded text-white/60 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSendComment}
                            disabled={sendingComment || !commentText.trim()}
                            className="text-xs px-3 py-1.5 rounded-lg bg-velion-cyan/20 text-velion-cyan hover:bg-velion-cyan/30 font-medium disabled:opacity-40 flex items-center gap-1"
                          >
                            <HiPaperAirplane size={12} />
                            {language === "es" ? "Enviar" : "Send"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-[340px] lg:w-[380px] flex flex-col border-l border-[var(--glass-border)]">
                <div className="p-4 border-b border-[var(--glass-border)]">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">
                    {format(new Date(piece.scheduled_date + "T" + (piece.scheduled_time || "00:00")), "MMM d, yyyy · HH:mm", { locale: dateLocale })}
                  </div>
                  {piece.caption && (
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{piece.caption}</p>
                  )}
                </div>
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <HiChat size={16} className="text-velion-cyan" />
                    {language === "es" ? "Anotaciones" : "Annotations"}
                    <span className="text-xs text-[var(--text-secondary)] font-normal">
                      ({comments.length})
                    </span>
                  </h4>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {language === "es" ? "Click en la imagen" : "Click on image"}
                  </span>
                </div>
                <div ref={commentsListRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-xs">
                      <HiChat size={28} className="mx-auto mb-2 opacity-30" />
                      <p>{language === "es" ? "Haz clic en la imagen para anotar" : "Click the image to annotate"}</p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isMine = c.user_id === user?.id;
                      const name = c.profile
                        ? `${c.profile.first_name} ${c.profile.last_name}`.trim() || "—"
                        : "—";
                      const initials = c.profile
                        ? `${c.profile.first_name.charAt(0)}${c.profile.last_name.charAt(0)}`.toUpperCase() || "?"
                        : "?";
                      const timeAgo = formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      });
                      const wasEdited = c.updated_at !== c.created_at;

                      return (
                        <div
                          key={c.id}
                          data-comment-id={c.id}
                          className={`animate-fade-in rounded-xl p-2.5 transition-all cursor-pointer ${
                            selectedComment === c.id
                              ? "bg-velion-cyan/10 border border-velion-cyan/30"
                              : "hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setSelectedComment(selectedComment === c.id ? null : c.id);
                            setClickPos(null);
                          }}
                        >
                          <div className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold ${
                              isMine ? "bg-velion-cyan/20 text-velion-cyan" : "bg-white/10 text-[var(--text-secondary)]"
                            }`}>
                              {initials}
                            </div>
                            <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[80%]`}>
                              <span className="text-[10px] text-[var(--text-secondary)] mb-0.5 px-1 font-medium">{name}</span>
                              {editingCommentId === c.id ? (
                                <div className="w-full space-y-1.5">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-velion-cyan/50 resize-none"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button onClick={() => { setEditingCommentId(null); setEditText(""); }} className="text-[10px] px-2 py-1 rounded text-[var(--text-secondary)] hover:bg-white/10">
                                      {t.calendar.cancel}
                                    </button>
                                    <Button size="sm" onClick={() => handleEditComment(c.id)}>
                                      {t.pillars.saveBrief}
                                    </Button>
                                  </div>
                                </div>
                              ) : deletingCommentId === c.id ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[var(--text-secondary)]">{t.pillars.deleteConfirm}</span>
                                  <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                                    {t.calendar.delete}
                                  </button>
                                  <button onClick={() => setDeletingCommentId(null)} className="text-[10px] px-2 py-1 rounded text-[var(--text-secondary)] hover:bg-white/10">
                                    {t.calendar.cancel}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed w-full ${
                                    isMine
                                      ? "bg-velion-cyan/15 text-velion-cyan border border-velion-cyan/20 rounded-br-md"
                                      : "bg-white/10 text-[var(--text-primary)] border border-[var(--glass-border)] rounded-bl-md"
                                  }`}>
                                    <p className="whitespace-pre-wrap">{c.content}</p>
                                    <div className={`flex items-center justify-between mt-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
                                      <p className={`text-[10px] ${isMine ? "text-velion-cyan/60" : "text-[var(--text-secondary)]"}`}>
                                        {timeAgo}{wasEdited && " · edited"}
                                      </p>
                                      {isMine && (
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => { setEditingCommentId(c.id); setEditText(c.content); }} className="text-[10px] p-0.5 rounded hover:bg-white/10 opacity-60 hover:opacity-100">
                                            <HiPencil size={12} />
                                          </button>
                                          <button onClick={() => setDeletingCommentId(c.id)} className="text-[10px] p-0.5 rounded hover:bg-white/10 opacity-60 hover:opacity-100">
                                            <HiXCircle size={12} />
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
