// AIventure domain types — mirror supabase/schema.sql

export type RSVP = "in" | "maybe" | "out";
export type PlanStatus = "draft" | "open" | "locked" | "completed" | "cancelled";
export type Visibility = "group" | "invite" | "open" | "filtered";
export type OptionKind = "activity" | "place" | "time";
export type OptionSource = "ai" | "human";

export interface Profile {
  id: string;
  auth_id: string | null;
  name: string;
  email: string | null;
  avatar?: string | null;
  interests: string[];
  interest_notes: string | null;
  is_paid: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string | null;
  created_at: string;
}

export interface KeyInfo {
  label: string;
}

export interface Plan {
  id: string;
  slug: string;
  title: string;
  intent: string | null;
  status: PlanStatus;
  visibility: Visibility;
  creator_id: string | null;
  group_id: string | null;
  interest_filter: string[];
  ai_empowered: boolean;
  activity: string | null;
  starts_at: string | null;
  place_name: string | null;
  place_address: string | null;
  place_lat: number | null;
  place_lng: number | null;
  place_url: string | null;
  why: string | null;
  key_info: KeyInfo[];
  cover_hue: string;
  cover_url?: string | null;
  adventure_no: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface PlanOption {
  id: string;
  plan_id: string;
  kind: OptionKind;
  source: OptionSource;
  title: string;
  subtitle: string | null;
  why: string | null;
  image_url: string | null;
  source_url: string | null;
  source_label: string | null;
  payload: Record<string, unknown>;
  suggested_by: string | null;
  votes: number;
  created_at: string;
}

export interface PlanMember {
  plan_id: string;
  profile_id: string;
  rsvp: RSVP;
  joined_via: "app" | "web";
  notify_email: string | null;
  created_at: string;
  profile?: Profile;
}

export interface PlanComment {
  id: string;
  plan_id: string;
  profile_id: string | null;
  body: string;
  attached_to: string | null;
  created_at: string;
  profile?: Profile;
}

// ---- Activities & Adventures (multi-activity plans) ----
export type PlanScope = "surprise" | "single" | "adventure" | "trip";

export interface Activity {
  id: string;
  title: string;
  subtitle?: string;
  time?: string; // "16:00"
  day?: number; // 1-based for multi-day trips
  place_name?: string;
  why?: string;
  source_label?: string;
  source_url?: string;
  tile: string; // pixel tile key (hike, pub, ...)
}

export interface Adventure {
  slug: string;
  title: string;
  scope: PlanScope; // "adventure" (a day) | "trip" (multi-day)
  days: number; // 1 for a day, N for a trip
  who: string;
  cover: string;
  ai_empowered: boolean;
  members: Profile[];
  activities: Activity[];
}

// shape the AI Drop agent returns per option, before we persist it
export interface DropOption {
  kind: OptionKind;
  title: string;
  subtitle?: string;
  why: string;
  source_url?: string;
  source_label?: string;
  key_info?: KeyInfo[];
  payload?: Record<string, unknown>;
}
