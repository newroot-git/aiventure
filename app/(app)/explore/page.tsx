import { ExploreView } from "@/components/ExploreView";
import { getCommunities, getOpenEvents, getCurrentProfile } from "@/lib/db";
import { CATEGORIES } from "@/lib/interests";
import { freshIdeas } from "@/lib/ideas";

const CAT_OF = new Map<string, string>();
for (const c of CATEGORIES) for (const i of c.interests) CAT_OF.set(i.toLowerCase(), c.id);

export default async function ExplorePage() {
  const [communities, events, me] = await Promise.all([
    getCommunities(), getOpenEvents(), getCurrentProfile(),
  ]);
  const cats = Array.from(new Set(
    (me?.interests ?? []).map((i) => CAT_OF.get(i.toLowerCase())).filter(Boolean) as string[],
  ));
  // rotate the picks daily so there's always something fresh to consider
  const seed = new Date().getDate();
  const ideas = freshIdeas(cats, seed);

  return <ExploreView communities={communities} events={events} ideas={ideas} />;
}
