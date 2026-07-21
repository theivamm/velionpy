export { createClient } from "./supabase/client";
export { createAdminClient } from "./supabase/admin";
export { updateSession } from "./supabase/middleware";

export type {
  PieceType,
  CalendarPiece,
  MonthlyBrief,
  IdeaStatus,
  PillarIdea,
  IdeaComment,
  Profile,
  CommentWithProfile,
  BriefComment,
  BriefCommentWithProfile,
  PieceComment,
  PieceCommentWithProfile,
} from "./types/database.types";

export { AuthProvider, useAuth } from "./contexts/AuthContext";
export { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
export type { Language, Translations } from "./contexts/LanguageContext";

export { Button } from "./ui/Button";
export { GlassCard } from "./ui/GlassCard";
export { ModalPortal } from "./ui/ModalPortal";
export { ThemeToggle } from "./ui/ThemeToggle";
export { LanguageToggle } from "./ui/LanguageToggle";
