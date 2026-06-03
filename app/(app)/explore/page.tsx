import { ExploreView } from "@/components/ExploreView";
import { getCommunities, getOpenEvents } from "@/lib/db";

export default async function ExplorePage() {
  const [communities, events] = await Promise.all([getCommunities(), getOpenEvents()]);
  return <ExploreView communities={communities} events={events} />;
}
