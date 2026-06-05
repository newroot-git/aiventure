"use client";
import * as React from "react";
import { Inbox } from "lucide-react";

// Localises a failed inbox fetch to the notifications slot so a rejected query
// streams a quiet fallback instead of bubbling to the root error page + killing
// the whole shell.
export class NotificationsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-9 w-9 place-items-center text-muted" title="Notifications unavailable" aria-hidden="true">
          <Inbox size={22} />
        </div>
      );
    }
    return this.props.children;
  }
}
