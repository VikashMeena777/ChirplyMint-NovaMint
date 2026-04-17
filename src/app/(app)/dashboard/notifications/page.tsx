"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  BarChart3,
  AlertTriangle,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/actions/notifications";
import { toast } from "sonner";

type Notification = Record<string, unknown>;

const typeIcons: Record<string, typeof Bell> = {
  weekly_report: BarChart3,
  dm_failed: AlertTriangle,
  new_lead: Users,
  product_update: Sparkles,
};

const typeColors: Record<string, string> = {
  weekly_report: "oklch(0.65 0.15 250)",
  dm_failed: "oklch(0.6 0.2 25)",
  new_lead: "oklch(0.52 0.19 162)",
  product_update: "oklch(0.7 0.18 60)",
};

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  notifications.forEach((n) => {
    const d = new Date(n.created_at as string);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].items.push(n);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter((g) => g.items.length > 0);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const data = await getNotifications(50);
    setNotifications(data);
    setLoading(false);
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markAsRead(id);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const result = await markAllAsRead();
    if (result.error) toast.error(result.error);
    else toast.success("All notifications marked as read");
  }

  async function handleDelete(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const result = await deleteNotification(id);
    if (result.error) toast.error(result.error);
    else toast.success("Notification removed");
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const grouped = groupByDate(notifications);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No notifications yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            You&apos;ll see DM alerts, weekly reports, and product updates here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {group.label}
              </p>
              <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border overflow-hidden">
                {group.items.map((n) => {
                  const Icon = typeIcons[n.type as string] || Bell;
                  const color = typeColors[n.type as string] || "oklch(0.5 0.1 200)";
                  const isUnread = !n.is_read;

                  return (
                    <div
                      key={n.id as string}
                      className={`flex items-start gap-4 p-4 transition-colors ${
                        isUnread
                          ? "bg-[oklch(0.52_0.19_162/3%)]"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `color-mix(in oklch, ${color}, transparent 88%)` }}
                      >
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"} text-foreground`}>
                              {String(n.title ?? "")}
                            </p>
                            {n.body ? (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {String(n.body)}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.created_at as string).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isUnread && (
                              <button
                                onClick={() => handleMarkRead(n.id as string)}
                                className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-muted-foreground" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(n.id as string)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-[oklch(0.52_0.19_162)] shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
