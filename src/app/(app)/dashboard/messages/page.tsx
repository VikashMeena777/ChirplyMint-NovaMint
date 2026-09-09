"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageCircle,
  Search,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  RotateCcw,
  CheckCheck,
  Inbox as InboxIcon,
  Pause,
  Play,
  ArrowLeft,
  BotOff,
} from "lucide-react";
import { getMessages, getMessageStats } from "@/lib/actions/messages";
import { retryFailedDM } from "@/lib/actions/retry-dm";
import {
  getInboxThreads,
  getThreadMessages,
  replyInThread,
  setLeadAiPaused,
  getLeadAiPaused,
  type InboxThread,
  type InboxMessage,
} from "@/lib/actions/inbox";
import { toast } from "sonner";

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

type Tab = "inbox" | "log";

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>("inbox");

  // ── Inbox state ──
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [inboxError, setInboxError] = useState("");
  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [threadMsgs, setThreadMsgs] = useState<InboxMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiPaused, setAiPaused] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Log state ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const limit = 15;

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    const result = await getInboxThreads();
    setThreads(result.threads);
    setInboxError(result.error || "");
    setThreadsLoading(false);
  }, []);

  const openThread = useCallback(async (t: InboxThread) => {
    setActiveThread(t);
    setThreadLoading(true);
    setThreadMsgs([]);
    const result = await getThreadMessages(t.threadId);
    setThreadMsgs(result.messages);
    if (result.error) toast.error(result.error);
    const pid = result.participantId || t.participantId;
    if (pid) setAiPaused(await getLeadAiPaused(pid));
    setThreadLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const handleReply = useCallback(async () => {
    if (!activeThread || !replyText.trim()) return;
    setSending(true);
    const result = await replyInThread(activeThread.participantId, replyText);
    setSending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setThreadMsgs((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}`,
        fromMe: true,
        text: replyText,
        at: new Date().toISOString(),
      },
    ]);
    setReplyText("");
    toast.success("Reply sent");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [activeThread, replyText]);

  const handleTogglePause = useCallback(async () => {
    if (!activeThread) return;
    setTogglingPause(true);
    const result = await setLeadAiPaused(activeThread.participantId, !aiPaused);
    setTogglingPause(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setAiPaused(!aiPaused);
      toast.success(aiPaused ? "AI re-enabled for this person" : "AI paused — you're replying personally now");
    }
  }, [activeThread, aiPaused]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const result = await getMessages(page, limit, search, status);
    setMessages(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [page, search, status]);

  const handleRetry = useCallback(
    async (dmLogId: string) => {
      setRetryingId(dmLogId);
      try {
        const result = await retryFailedDM(dmLogId);
        if (result.success) {
          loadMessages();
        } else {
          toast.error(result.error || "Failed to retry DM");
        }
      } catch {
        toast.error("Something went wrong. Try again.");
      } finally {
        setRetryingId(null);
      }
    },
    [loadMessages]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (tab === "log") loadMessages();
  }, [tab, loadMessages]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    if (tab === "log") getMessageStats().then(setStats);
  }, [tab, messages.length]);

  const totalPages = Math.ceil(total / limit);
  const filteredThreads = threads.filter(
    (t) =>
      !threadSearch ||
      t.participantName.toLowerCase().includes(threadSearch.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(threadSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header + tab switch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "inbox"
              ? "Live conversations — reply personally or pause the AI to take over."
              : "Every DM your automations have sent."}
          </p>
        </div>
        <div className="flex items-center bg-muted rounded-xl p-1 gap-1 self-start">
          <button
            onClick={() => setTab("inbox")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === "inbox" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <InboxIcon className="w-4 h-4" /> Inbox
          </button>
          <button
            onClick={() => setTab("log")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === "log" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Sent Log
          </button>
        </div>
      </div>

      {tab === "inbox" && (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
          {/* Thread list */}
          <div className={`rounded-2xl bg-card border border-border overflow-hidden flex flex-col ${activeThread ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {threadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                </div>
              ) : inboxError ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <BotOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {inboxError}
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No conversations yet. DMs will appear here when leads message you.
                </div>
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={t.threadId}
                    onClick={() => openThread(t)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${
                      activeThread?.threadId === t.threadId ? "bg-[oklch(0.52_0.19_162/8%)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">@{t.participantName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread view */}
          <div className={`rounded-2xl bg-card border border-border flex flex-col ${activeThread ? "flex" : "hidden md:flex"}`}>
            {!activeThread ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <InboxIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a conversation to read and reply</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <button onClick={() => setActiveThread(null)} className="md:hidden p-1.5 rounded-lg hover:bg-muted/40">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">@{activeThread.participantName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {aiPaused ? "AI paused — you're replying personally" : "AI agent active"}
                    </p>
                  </div>
                  <button
                    onClick={handleTogglePause}
                    disabled={togglingPause}
                    className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
                      aiPaused
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/60"
                    }`}
                    title={aiPaused ? "Re-enable the AI agent for this person" : "Pause the AI and reply personally"}
                  >
                    {togglingPause ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : aiPaused ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                    {aiPaused ? "Resume AI" : "Pause AI"}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-muted/10">
                  {threadLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : threadMsgs.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground pt-8">No messages in this thread.</p>
                  ) : (
                    threadMsgs.map((m) => (
                      <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                            m.fromMe
                              ? "bg-[oklch(0.52_0.19_162)] text-white rounded-br-md"
                              : "bg-card border border-border text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={`text-[9px] mt-1 ${m.fromMe ? "text-white/60" : "text-muted-foreground/60"}`}>
                            {m.at ? new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="p-3 border-t border-border flex items-center gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                    placeholder="Reply personally…"
                    className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
                  />
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyText.trim()}
                    className="h-11 w-11 rounded-xl bg-[oklch(0.52_0.19_162)] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
                    title="Send reply"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "log" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, icon: MessageCircle, color: "oklch(0.52 0.19 162)" },
              { label: "Sent", value: stats.sent, icon: CheckCircle2, color: "oklch(0.55 0.18 145)" },
              { label: "Pending", value: stats.pending, icon: Clock, color: "oklch(0.75 0.15 80)" },
              { label: "Failed", value: stats.failed, icon: AlertCircle, color: "oklch(0.55 0.22 25)" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by username or message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {statusFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatus(f.id)}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    status === f.id
                      ? "bg-[oklch(0.52_0.19_162)] text-white"
                      : "bg-card border border-border text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  {search || status !== "all" ? "No messages match your filters" : "No messages yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || status !== "all" ? "Try different filters." : "Your automation DMs will appear here once they start sending."}
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
                          <p className="text-sm font-semibold text-foreground">@{(msg.recipient_username as string) || "unknown"}</p>
                          <p className="text-sm text-muted-foreground truncate">{(msg.message_text as string) || "—"}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{msg.status as string}</span>
                            {msg.status === "sent" && (msg.seen_at as string | null) && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400" title={`Read ${new Date(msg.seen_at as string).toLocaleString()}`}>
                                <CheckCheck className="w-3 h-3" /> Seen
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(msg.sent_at as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="ml-14 rounded-xl bg-muted/20 border border-border p-4 space-y-2">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{(msg.message_text as string) || "No message content"}</p>
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  Context: <strong className="text-foreground">{(msg.comment_text as string) || "direct"}</strong>
                                </span>
                                <span>
                                  Sent: <strong className="text-foreground">{new Date(msg.sent_at as string).toLocaleString()}</strong>
                                </span>
                              </div>
                              {(msg.status as string) === "failed" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetry(id);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-xs font-medium hover:bg-[oklch(0.52_0.19_162/20%)]"
                                >
                                  {retryingId === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                  Retry
                                </button>
                              )}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
