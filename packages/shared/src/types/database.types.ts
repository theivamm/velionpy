export type PieceType = "carousel" | "story" | "reel" | "post";

export type PieceStatus = "pending" | "ready_to_post" | "posted";

export interface CalendarPiece {
  id: string;
  user_id: string;
  title: string;
  type: PieceType;
  status: PieceStatus;
  scheduled_date: string;
  scheduled_time: string;
  media_url: string | null;
  media_additional: string[];
  pillar_idea_id: string | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBrief {
  id: string;
  user_id: string;
  month: string;
  year: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export type IdeaStatus = "approved" | "needs_revision" | "standby" | "draft" | "posted" | "archived";

export interface PillarIdea {
  id: string;
  user_id: string;
  brief_id: string | null;
  title: string;
  description: string | null;
  pillar: string;
  theme: string;
  type: PieceType;
  status: IdeaStatus;
  feedback: string | null;
  scheduled_date: string | null;
  image_url: string | null;
  copy: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentWithProfile extends IdeaComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}

export interface BriefComment {
  id: string;
  brief_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface BriefCommentWithProfile extends BriefComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}

export interface PieceComment {
  id: string;
  piece_id: string;
  user_id: string;
  content: string;
  x_pos: number;
  y_pos: number;
  created_at: string;
  updated_at: string;
}

export interface PieceCommentWithProfile extends PieceComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  avatar_url: string | null;
  notes: string | null;
  status: "active" | "inactive" | "lead";
  created_at: string;
  updated_at: string;
}
