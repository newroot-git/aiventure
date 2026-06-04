import { redirect } from "next/navigation";

// Adventures are now unified into plans (slots model). Keep old /a links alive.
export default async function AdventurePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/p/${slug}`);
}
