"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  Bot,
  MessageSquare,
  Users,
  Zap,
  Plus,
  Trash2,
  Save,
  Power,
  PowerOff,
  Pencil,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAIAgent,
  createAIAgent,
  updateAIAgent,
  getAgentFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  getRecentConversations,
  getConversationThread,
  getAgentStats,
  type AIAgent,
  type AIAgentFAQ,
  type AIConversation,
} from "@/lib/actions/ai-agent";

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "casual", label: "Casual", emoji: "😎" },
  { value: "enthusiastic", label: "Enthusiastic", emoji: "🔥" },
  { value: "witty", label: "Witty", emoji: "😏" },
];

export default function AIAgentPage() {
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [faqs, setFaqs] = useState<AIAgentFAQ[]>([]);
  const [conversations, setConversations] = useState<
    {
      sender_ig_id: string;
      sender_username: string;
      last_message: string;
      last_role: string;
      last_at: string;
      message_count: number;
    }[]
  >([]);
  const [selectedThread, setSelectedThread] = useState<AIConversation[]>([]);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    activeToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"persona" | "faqs" | "conversations">(
    "persona"
  );

  // Agent form state
  const [agentName, setAgentName] = useState("");
  const [persona, setPersona] = useState("");
  const [tone, setTone] = useState("friendly");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [maxReplyLength, setMaxReplyLength] = useState(300);

  // FAQ form state
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const loadAgent = useCallback(async () => {
    const { data } = await getAIAgent();
    if (data) {
      setAgent(data);
      setAgentName(data.agent_name);
      setPersona(data.persona);
      setTone(data.tone);
      setGreetingMessage(data.greeting_message);
      setFallbackMessage(data.fallback_message);
      setMaxReplyLength(data.max_reply_length);

      const [faqResult, convResult, statsResult] = await Promise.all([
        getAgentFAQs(data.id),
        getRecentConversations(data.id),
        getAgentStats(),
      ]);
      setFaqs(faqResult.data);
      setConversations(convResult.data);
      setStats(statsResult);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  async function handleCreateAgent() {
    setSaving(true);
    const { error } = await createAIAgent("My Assistant");
    if (error) {
      toast.error(error);
    } else {
      toast.success("AI Agent created!");
      await loadAgent();
    }
    setSaving(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await updateAIAgent({
      agent_name: agentName,
      persona,
      tone,
      greeting_message: greetingMessage,
      fallback_message: fallbackMessage,
      max_reply_length: maxReplyLength,
    });
    if (error) {
      toast.error(error);
    } else {
      toast.success("Agent settings saved!");
      await loadAgent();
    }
    setSaving(false);
  }

  async function handleToggleActive() {
    if (!agent) return;
    const newState = !agent.is_active;
    const { error } = await updateAIAgent({ is_active: newState });
    if (error) {
      toast.error(error);
    } else {
      toast.success(newState ? "AI Agent activated! 🚀" : "AI Agent paused");
      await loadAgent();
    }
  }

  async function handleAddFAQ() {
    if (!agent || !newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }
    const { error } = await addFAQ(agent.id, newQuestion, newAnswer);
    if (error) {
      toast.error(error);
    } else {
      toast.success("FAQ added!");
      setNewQuestion("");
      setNewAnswer("");
      const result = await getAgentFAQs(agent.id);
      setFaqs(result.data);
    }
  }

  async function handleDeleteFAQ(faqId: string) {
    const { error } = await deleteFAQ(faqId);
    if (error) {
      toast.error(error);
    } else {
      toast.success("FAQ removed");
      if (agent) {
        const result = await getAgentFAQs(agent.id);
        setFaqs(result.data);
      }
    }
  }

  async function handleToggleFAQ(faqId: string, currentActive: boolean) {
    await updateFAQ(faqId, { is_active: !currentActive });
    if (agent) {
      const result = await getAgentFAQs(agent.id);
      setFaqs(result.data);
    }
  }

  async function handleViewThread(senderIgId: string) {
    if (!agent) return;
    setSelectedSender(senderIgId);
    const { data } = await getConversationThread(agent.id, senderIgId);
    setSelectedThread(data);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-card border border-border rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ── No agent yet — show creation screen ──
  if (!agent) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
          <BrainCircuit className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          AI Agent for DMs
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mb-8">
          Set up your always-on AI assistant that replies to Instagram DMs
          automatically with your unique persona, tone, and knowledge.
        </p>
        <button
          onClick={handleCreateAgent}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-60"
        >
          <Sparkles className="w-5 h-5" />
          {saving ? "Creating..." : "Create AI Agent"}
        </button>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-violet-500" />
            AI Agent
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your AI-powered DM assistant
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              agent.is_active
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
            }`}
          >
            {agent.is_active ? (
              <>
                <Power className="w-4 h-4" /> Active
              </>
            ) : (
              <>
                <PowerOff className="w-4 h-4" /> Inactive
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Conversations",
            value: stats.totalConversations,
            icon: Users,
            color: "violet",
          },
          {
            label: "Messages Sent",
            value: stats.totalMessages,
            icon: MessageSquare,
            color: "indigo",
          },
          {
            label: "Active Today",
            value: stats.activeToday,
            icon: Zap,
            color: "emerald",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                stat.color === "violet"
                  ? "bg-violet-500/10 text-violet-500"
                  : stat.color === "indigo"
                  ? "bg-indigo-500/10 text-indigo-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(
          [
            { key: "persona", label: "Persona & Settings", icon: Bot },
            { key: "faqs", label: "FAQ Knowledge", icon: HelpCircle },
            {
              key: "conversations",
              label: "Conversations",
              icon: MessageSquare,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── PERSONA TAB ── */}
      {tab === "persona" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Agent Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="My Assistant"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      tone === t.value
                        ? "border-violet-500 bg-violet-500/10 text-violet-600"
                        : "border-border bg-background text-muted-foreground hover:border-violet-500/40"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Persona Instructions
            </label>
            <p className="text-xs text-muted-foreground">
              Describe who your agent is, what it knows, and how it should
              behave. Be specific!
            </p>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={5}
              placeholder="You are a fitness coach named Alex. You help people with workout plans, nutrition advice, and motivation. You specialize in home workouts and have 10 years of experience..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Greeting Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Greeting Message
              </label>
              <p className="text-xs text-muted-foreground">
                First message sent when someone DMs you for the first time
              </p>
              <textarea
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                rows={3}
                placeholder="Hey! 👋 Thanks for reaching out..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none text-sm"
              />
            </div>

            {/* Fallback Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fallback Message
              </label>
              <p className="text-xs text-muted-foreground">
                Sent when AI can&apos;t generate a response
              </p>
              <textarea
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                rows={3}
                placeholder="Great question! Let me check and get back to you..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none text-sm"
              />
            </div>
          </div>

          {/* Max Reply Length */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Max Reply Length: {maxReplyLength} chars
            </label>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={maxReplyLength}
              onChange={(e) => setMaxReplyLength(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100 (concise)</span>
              <span>1000 (detailed)</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ── FAQ TAB ── */}
      {tab === "faqs" && (
        <div className="space-y-4">
          {/* Add FAQ */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-violet-500" />
              Add FAQ
            </h3>
            <p className="text-xs text-muted-foreground">
              FAQs help your agent answer questions accurately. The AI will
              reference these when responding.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Question
                </label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder='e.g. "What are your prices?"'
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Answer
                </label>
                <input
                  type="text"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder='e.g. "Our plans start at $29/mo..."'
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
            </div>
            <button
              onClick={handleAddFAQ}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-600 font-medium text-sm hover:bg-violet-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* FAQ List */}
          {faqs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No FAQs yet
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Add questions and answers to help your agent respond accurately
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`bg-card border rounded-2xl p-4 transition-all ${
                    faq.is_active
                      ? "border-border"
                      : "border-border/50 opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Q: {faq.question}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        A: {faq.answer}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          handleToggleFAQ(faq.id, faq.is_active)
                        }
                        className={`p-2 rounded-lg text-xs transition-all ${
                          faq.is_active
                            ? "text-emerald-600 hover:bg-emerald-500/10"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={
                          faq.is_active ? "Disable FAQ" : "Enable FAQ"
                        }
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFAQ(faq.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONVERSATIONS TAB ── */}
      {tab === "conversations" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Thread List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden md:col-span-1">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Threads
              </h3>
            </div>
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  They&apos;ll appear here when people DM you
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.sender_ig_id}
                    onClick={() => handleViewThread(conv.sender_ig_id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-all ${
                      selectedSender === conv.sender_ig_id
                        ? "bg-violet-500/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">
                        @{conv.sender_username || conv.sender_ig_id.slice(0, 8)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message.slice(0, 50)}...
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.last_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-violet-500 font-medium">
                        {conv.message_count} msgs
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread Detail */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden md:col-span-2">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                {selectedSender
                  ? `Conversation with @${selectedSender.slice(0, 12)}...`
                  : "Select a conversation"}
              </h3>
            </div>
            {selectedThread.length === 0 ? (
              <div className="p-12 text-center">
                <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedSender
                    ? "Loading..."
                    : "Click a thread to view the conversation"}
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                {selectedThread.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "assistant" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === "assistant"
                          ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.role === "assistant"
                            ? "text-white/60"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
