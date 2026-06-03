import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanView } from "@/components/PlanView";
import { MOCK_PLAN, MOCK_OPTIONS, MOCK_MEMBERS } from "@/lib/mock";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = { ...MOCK_PLAN, slug };

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Home
      </Link>
      <PlanView plan={plan} options={MOCK_OPTIONS} members={MOCK_MEMBERS} />
    </div>
  );
}
