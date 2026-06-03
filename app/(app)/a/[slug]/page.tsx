import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdventureView } from "@/components/AdventureView";
import { getAdventureBySlug } from "@/lib/db";
import { MOCK_ADVENTURE } from "@/lib/mock";

export default async function AdventurePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const adventure = (await getAdventureBySlug(slug).catch(() => null)) ?? { ...MOCK_ADVENTURE, slug };

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Home
      </Link>
      <AdventureView adventure={adventure} />
    </div>
  );
}
