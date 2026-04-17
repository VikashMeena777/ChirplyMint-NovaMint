"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
} from "lucide-react";
import { getMessages, getMessageStats } from "@/lib/actions/messages";

type Message = Record<string, unknown>;
type StatusFilter = "all" | "sent" | "pending" | "failed";

const statusFilters: { id: StatusFilter; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: MessageCircle },
  { id: "sent", label: "Sent", icon: CheckCircle2 },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "failed", label: "Failed", icon: AlertCircle },
];

const statusStyles: Record<string, { bg: string; text: string }> = {
  sent: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400" },
  pending: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" },
  failed: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400" },
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 15;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const result = await getMessages(page, limit, search, status);
    setMessages(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    getMessageStats().then(setStats);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All DM conversations from your automations.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Send, color: "oklch(0.52 0.19 162)" },
          { label: "Sent", value: stats.sent, icon: CheckCircle2, color: "oklch(0.55 0.18 145)" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "oklch(0.7 0.18 60)" },
          { label: "Failed", value: stats.failed, icon: AlertCircle, color: "oklch(0.6 0.2 25)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-card border border-border p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by username or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === f.id
                  ? "bg-[oklch(0.52_0.19_162)] text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {search || status !== "all" ? "No messages match your filters" : "No messages yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || status !== "all"
                ? "Try adjusting your search or filter."
                : "Messages will appear here once your automations start sending DMs."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((msg) => {
              const id = msg.id as string;
              const isExpanded = expandedId === id;
              const style = statusStyles[msg.status as string] || statusStyles.pending;

              return (
                <div key={id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[oklch(0.52_0.19_162)]">
                        {((msg.recipient_username as string) || "U")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        @{(msg.recipient_username as string) || "unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {(msg.message_text as string) || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                      >
                        {msg.status as string}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.sent_at as string).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-14 rounded-xl bg-muted/20 border border-border p-4 space-y-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {(msg.message_text as string) || "No message content"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                          <span>
                            Trigger:{" "}
                            <strong className="text-foreground">
                              {(msg.trigger_type as string) || "unknown"}
                            </strong>
                          </span>
                          <span>
                            Sent:{" "}
                            <strong className="text-foreground">
                              {new Date(msg.sent_at as string).toLocaleString()}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
