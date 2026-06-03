"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, UserRound, CalendarDays, Check, X } from "lucide-react";
import { Card, Pill, Button } from "@/components/ui";
import { MOCK_INVITES, type Invite } from "@/lib/mock";

export default function InvitesPage() {
  const [items, setItems] = React.useState(MOCK_INVITES);

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
            <InviteCard
              key={iv.id}
              invite={iv}
              onDismiss={() => setItems((s) => s.filter((x) => x.id !== iv.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}

function InviteCard({ invite, onDismiss }: { invite: Invite; onDismiss: () => void }) {
  const router = useRouter();
  return (
    <Card hard className="overflow-hidden p-0">
      <div className="flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={invite.cover} alt="" className="h-auto w-24 shrink-0 border-r-2 border-ink/10 object-cover" />
        <div className="min-w-0 flex-1 p-4">
          <Pill tone={invite.kind === "community" ? "secondary" : "primary"}>
            {invite.kind === "community" ? <Users size={12} /> : <UserRound size={12} />}
            {invite.fromLabel}
          </Pill>
          <h3 className="mt-2 font-heading font-bold leading-snug">{invite.activity}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted">
            <CalendarDays size={13} /> {invite.dateLabel}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => router.push(`/p/${invite.slug}`)}>
              <Check size={15} /> Accept
            </Button>
            <Button size="sm" variant="soft" onClick={onDismiss}>
              <X size={15} /> Decline
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
