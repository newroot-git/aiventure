import { Users, UserRound, CalendarDays } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { getInvites } from "@/lib/db";
import { InviteActions } from "./InviteActions";

export default async function InvitesPage() {
  const items = await getInvites();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Invites</h1>
      <p className="mt-1 text-[15px] text-muted">
        Plans your friends and communities want you in on.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            All caught up. No pending invites.
          </Card>
        ) : (
          items.map((iv) => (
            <Card key={iv.id} hard className="overflow-hidden p-0">
              <div className="flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iv.cover} alt="" className="h-auto w-24 shrink-0 border-r-2 border-ink/10 object-cover" />
                <div className="min-w-0 flex-1 p-4">
                  <Pill tone={iv.kind === "community" ? "secondary" : "primary"}>
                    {iv.kind === "community" ? <Users size={12} /> : <UserRound size={12} />}
                    {iv.fromLabel}
                  </Pill>
                  <h3 className="mt-2 font-heading font-bold leading-snug">{iv.activity}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <CalendarDays size={13} /> {iv.dateLabel}
                  </div>
                  <InviteActions slug={iv.slug} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
