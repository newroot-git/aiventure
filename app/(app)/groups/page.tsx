import { CrewView } from "@/components/CrewView";
import { getUserGroups, getFriends } from "@/lib/db";

export default async function CrewPage() {
  const [groups, friends] = await Promise.all([getUserGroups(), getFriends()]);
  return <CrewView groups={groups} friends={friends} />;
}
