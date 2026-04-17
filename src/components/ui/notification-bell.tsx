"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/actions/notifications";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchCount();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCount() {
    try {
      const c = await getUnreadCount();
      setCount(c);
    } catch {
      // silently fail
    }
  }

  return (
    <Link
      href="/dashboard/notifications"
      className="relative p-2 rounded-xl hover:bg-muted/40 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[oklch(0.52_0.19_162)] text-white text-[10px] font-bold px-1">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
