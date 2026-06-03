import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { generateDrop, mapsUrl, type DropInput } from "./ai";
import { planSlug } from "./slug";
import type { Plan, PlanOption, PlanMember } from "./types";

const COVERS: Record<string, string> = {
  hike: "/img/cover-hike.png",
  pub: "/img/cover-pub.png",
  climb: "/img/cover-climb.png",
  park: "/img/cover-park.png",
  gig: "/img/cover-gig.png",
};
// cover_hue stores a tile key for AI-generated plans → map to a cover image
function deriveCover(hue?: string | null): string | null {
  if (!hue) return null;
  return COVERS[hue] ?? `/img/tiles/${hue}.png`;
}

/** Generate options via the AI agent, persist the plan + options, return its slug. */
export async function createPlanFromDrop(input: DropInput): Promise<{ slug: string }> {
  const drop = await generateDrop({ ...input, scope: "single" });
  const options = drop.options ?? [];
  const slug = planSlug(`${Date.now()}-${input.intent}`);
  const db = supabaseAdmin();

  const { data: plan, error } = await db
    .from("plans")
    .insert({
      slug,
      title: input.intent.slice(0, 140),
      intent: input.intent,
      status: "open",
      visibility: "invite",
      ai_empowered: true,
      cover_hue: options[0]?.tile ?? "city",
    } as never)
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "insert plan failed");

  if (options.length) {
    const rows = options.map((o) => ({
      plan_id: (plan as { id: string }).id,
      kind: "activity",
      source: "ai",
      title: o.title,
      subtitle: o.subtitle ?? null,
      why: o.why ?? null,
      source_url: mapsUrl(o.map_query) ?? null,
      source_label: "AI + Maps",
      payload: { tile: o.tile, place_name: o.place_name ?? null },
    }));
    const { error: e2 } = await db.from("plan_options").insert(rows as never);
    if (e2) throw new Error(e2.message);
  }
  return { slug };
}

/** Load a persisted plan + its options + members by slug (null if not found). */
export async function getPlanBySlug(slug: string): Promise<{
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
} | null> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("*").eq("slug", slug).maybeSingle();
  if (!plan) return null;

  const row = plan as Record<string, unknown>;
  const { data: options } = await db
    .from("plan_options")
    .select("*")
    .eq("plan_id", row.id as string)
    .order("created_at");
  const { data: members } = await db
    .from("plan_members")
    .select("*, profile:profiles(*)")
    .eq("plan_id", row.id as string);

  return {
    plan: {
      ...(row as unknown as Plan),
      key_info: (row.key_info as Plan["key_info"]) ?? [],
      cover_url: deriveCover(row.cover_hue as string | null),
    },
    options: (options ?? []) as unknown as PlanOption[],
    members: (members ?? []) as unknown as PlanMember[],
  };
}
