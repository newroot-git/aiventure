import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PlanView } from "@/components/PlanView";
import { getPlanBySlug, getFriends } from "@/lib/db";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // a plan must exist in the DB — no mock fallback (a fake plan can't vote/refine/save)
  const [data, friends] = await Promise.all([
    getPlanBySlug(slug).catch(() => null),
    getFriends().catch(() => []),
  ]);
  if (!data) notFound();

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Home
      </Link>
      <PlanView
        plan={data.plan}
        options={data.options}
        members={data.members}
        friends={friends.map((f) => f.profile)}
        scaffold={data.scaffold}
        recurrence={data.recurrence}
        dateOptions={data.dateOptions}
        myRsvp={data.myRsvp}
        isOwner={data.isOwner}
      />
    </div>
  );
}
