"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle,
  Search,
  ChevronLeft,
  Loader2,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  MessagesSquare,
  CalendarDays,
  Hash,
} from "lucide-react";
import {
  getConversationList,
  getConversationThread,
  getConversationStats,
  submitReplyFeedback,
} from "@/lib/actions/ai-conversations";

type Conversation = Record<string, unknown>;
type Message = Record<string, unknown>;

export default function AIConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [stats, setStats] = useState({ total_conversations: 0, messages_today: 0, total_messages: 0 });
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string>>({});

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const result = await getConversationList(1, search);
    setConversations(result.conversations);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadConversations();
    getConversationStats().then(setStats);
  }, [loadConversations]);

  const openThread = async (senderIgId: string) => {
    setSelectedSender(senderIgId);
    setThreadLoading(true);
    const messages = await getConversationThread(senderIgId);
    setThread(messages);
    setThreadLoading(false);
  };

  const handleFeedback = async (messageId: string, agentId: string, rating: "good" | "bad") => {
    setFeedbackSent((prev) => ({ ...prev, [messageId]: rating }));
    await submitReplyFeedback(messageId, agentId, rating);
  };

  const selectedConvo = conversations.find((c) => c.sender_ig_id === selectedSender);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Conversations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          See what your AI agent is saying to your followers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Conversations", value: stats.total_conversations, icon: MessagesSquare, color: "oklch(0.52 0.19 162)" },
          { label: "Today", value: stats.messages_today, icon: CalendarDays, color: "oklch(0.65 0.15 250)" },
          { label: "Total Messages", value: stats.total_messages, icon: Hash, color: "oklch(0.7 0.18 60)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Inbox */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="flex h-[600px]">
          {/* Left Panel — Conversation List */}
          <div className={`${selectedSender ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border`}>
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mb-3">
                    <MessageCircle className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conversations will appear when your AI agent replies to followers.
                  </p>
                </div>
              ) : (
                conversations.map((convo) => {
                  const isSelected = convo.sender_ig_id === selectedSender;
                  return (
                    <button
                      key={convo.sender_ig_id as string}
                      onClick={() => openThread(convo.sender_ig_id as string)}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-border/50 ${
                        isSelected
                          ? "bg-[oklch(0.52_0.19_162/8%)]"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[oklch(0.52_0.19_162)]">
                          {((convo.sender_username as string) || "U")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">
                            @{(convo.sender_username as string) || "unknown"}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {new Date(convo.last_time as string).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {(convo.last_role as string) === "assistant" ? "🤖 " : ""}
                          {(convo.last_message as string)?.slice(0, 60) || "..."}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full shrink-0">
                        {convo.message_count as number}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel — Thread View */}
          <div className={`${selectedSender ? "flex" : "hidden md:flex"} flex-col flex-1`}>
            {selectedSender ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center gap-3 p-4 border-b border-border">
                  <button
                    onClick={() => setSelectedSender(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center">
                    <span className="text-xs font-bold text-[oklch(0.52_0.19_162)]">
                      {((selectedConvo?.sender_username as string) || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      @{(selectedConvo?.sender_username as string) || "unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {thread.length} messages
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {threadLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    thread.map((msg) => {
                      const isAssistant = (msg.role as string) === "assistant";
                      const msgId = msg.id as string;
                      const agentId = msg.agent_id as string;
                      const feedback = feedbackSent[msgId];

                      return (
                        <div
                          key={msgId}
                          className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`max-w-[80%] space-y-1`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm ${
                                isAssistant
                                  ? "bg-muted/50 text-foreground rounded-tl-md"
                                  : "bg-[oklch(0.52_0.19_162)] text-white rounded-tr-md"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {isAssistant && (
                                  <Bot className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[oklch(0.52_0.19_162)]" />
                                )}
                                {!isAssistant && (
                                  <User className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />
                                )}
                                <p className="whitespace-pre-wrap">{msg.content as string}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 px-1">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.created_at as string).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              {/* Feedback buttons — only for assistant messages */}
                              {isAssistant && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleFeedback(msgId, agentId, "good")}
                                    disabled={!!feedback}
                                    className={`p-1 rounded transition-colors ${
                                      feedback === "good"
                                        ? "text-green-500"
                                        : "text-muted-foreground/40 hover:text-green-500"
                                    }`}
                                    title="Good reply"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(msgId, agentId, "bad")}
                                    disabled={!!feedback}
                                    className={`p-1 rounded transition-colors ${
                                      feedback === "bad"
                                        ? "text-red-500"
                                        : "text-muted-foreground/40 hover:text-red-500"
                                    }`}
                                    title="Bad reply"
                                  >
                                    <ThumbsDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mb-4">
                  <Bot className="w-7 h-7 text-[oklch(0.52_0.19_162)]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Choose a conversation from the list to see the full message thread.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
