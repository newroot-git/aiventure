import { CrewView } from "@/components/CrewView";
import { getUserGroups, getFriends, getNudges } from "@/lib/db";

export default async function CrewPage() {
  const [groups, friends, nudges] = await Promise.all([getUserGroups(), getFriends(), getNudges()]);
  return <CrewView groups={groups} friends={friends} nudges={nudges} />;
}
