import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanView } from "@/components/PlanView";
import { getPlanBySlug, getFriends } from "@/lib/db";
import { MOCK_PLAN, MOCK_OPTIONS, MOCK_MEMBERS } from "@/lib/mock";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // live plan from the DB; fall back to the mock demo plan for seeded slugs
  const [live, friends] = await Promise.all([
    getPlanBySlug(slug).catch(() => null),
    getFriends().catch(() => []),
  ]);
  const data = live ?? { plan: { ...MOCK_PLAN, slug }, options: MOCK_OPTIONS, members: MOCK_MEMBERS };

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Home
      </Link>
      <PlanView plan={data.plan} options={data.options} members={data.members} friends={friends.map((f) => f.profile)} />
    </div>
  );
}
