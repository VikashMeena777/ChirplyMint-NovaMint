"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Send,
  User,
  AtSign,
  MessageCircle,
  ShieldCheck,
  Store,
  GraduationCap,
  Camera,
  Utensils,
  Dumbbell,
  Briefcase,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import type { AIAgent } from "@/lib/actions/ai-agent";
import {
  saveAIAgentOnboarding,
  previewAgentReply,
  getOnboardingPrefill,
  type OnboardingDraft,
} from "@/lib/actions/ai-agent";
import { assemblePersona } from "@/lib/ai/agent-setup";

/* ────────────────────────────────────────────────────────────
   Agent onboarding wizard — the activation gate's front end.
   The agent cannot reply to a single DM until this is finished,
   so everything here exists to give the AI real substance:
   who the owner is, what they post, what they offer.
   ──────────────────────────────────────────────────────────── */

const BUSINESS_TYPES = [
  { value: "creator", label: "Creator / Influencer", icon: AtSign, example: "I'm a travel creator sharing budget trips and hidden spots across India through reels and photos." },
  { value: "business", label: "Small Business", icon: Store, example: "I run a handmade candle brand — we post product drops, behind-the-scenes, and care tips." },
  { value: "coach", label: "Coach / Consultant", icon: Dumbbell, example: "I'm a fitness coach helping busy professionals lose weight with 30-minute home workouts." },
  { value: "restaurant", label: "Restaurant / Local", icon: Utensils, example: "We're a cozy café in Jaipur known for our cold coffee and all-day breakfast." },
  { value: "artist", label: "Artist / Photographer", icon: Camera, example: "I'm a wedding photographer capturing candid moments — portfolio, pricing, and booking info." },
  { value: "educator", label: "Educator / Courses", icon: GraduationCap, example: "I teach Instagram growth to small brands — tips, course launches, and free guides." },
  { value: "freelance", label: "Freelancer / Services", icon: Briefcase, example: "I design brand identities for startups — process, pricing, and availability." },
  { value: "other", label: "Something else", icon: Palette, example: "Tell people what your page is about in your own words." },
];

const TONES = [
  { value: "friendly", label: "Friendly", desc: "Warm and approachable — like chatting with a friend" },
  { value: "casual", label: "Casual", desc: "Chill and relaxed — slang and short replies" },
  { value: "professional", label: "Professional", desc: "Polished and clear — great for businesses" },
  { value: "enthusiastic", label: "Enthusiastic", desc: "High energy — excitement in every reply" },
];

const LANGUAGES = [
  { value: "auto", label: "Auto-detect", flag: "🌐" },
  { value: "english", label: "English", flag: "🇬🇧" },
  { value: "hindi", label: "Hindi", flag: "🇮🇳" },
  { value: "hinglish", label: "Hinglish", flag: "🇮🇳" },
  { value: "tamil", label: "Tamil", flag: "🇮🇳" },
  { value: "telugu", label: "Telugu", flag: "🇮🇳" },
  { value: "marathi", label: "Marathi", flag: "🇮🇳" },
  { value: "bangla", label: "Bangla", flag: "🇮🇳" },
  { value: "gujarati", label: "Gujarati", flag: "🇮🇳" },
];

const STEP_TITLES = [
  { title: "What's your page about?", sub: "This shapes how your agent introduces you" },
  { title: "Who are you?", sub: "Your agent needs to know who it's replying as" },
  { title: "Content & offers", sub: "What you post and what people can get" },
  { title: "Pick a voice", sub: "How your agent should sound in DMs" },
  { title: "First words & safety net", sub: "The greeting, and what to say when stuck" },
  { title: "Review & test", sub: "Try it out before it goes live" },
];

export function AgentOnboarding({
  agent,
  onComplete,
}: {
  agent: AIAgent;
  onComplete: (agent: AIAgent) => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [igName, setIgName] = useState<string | null>(null);

  // wizard state (prefilled from any earlier partial save)
  const [businessType, setBusinessType] = useState(agent.business_type || "");
  const [displayName, setDisplayName] = useState(
    agent.agent_name && agent.agent_name !== "Assistant" ? agent.agent_name : ""
  );
  const [about, setAbout] = useState(agent.about_text || "");
  const [topics, setTopics] = useState(agent.content_topics || "");
  const [offers, setOffers] = useState(agent.offers_text || "");
  const [tone, setTone] = useState(agent.tone || "friendly");
  const [language, setLanguage] = useState(
    !agent.language || agent.language === "en" ? "auto" : agent.language
  );
  const [greeting, setGreeting] = useState(agent.greeting_message || "");
  const [fallback, setFallback] = useState(agent.fallback_message || "");
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [personaOverride, setPersonaOverride] = useState("");

  // test chat state
  const [testMessages, setTestMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getOnboardingPrefill().then(({ ig_name }) => setIgName(ig_name ?? null));
  }, []);

  const typeExample = useMemo(
    () => BUSINESS_TYPES.find((t) => t.value === businessType)?.example ?? BUSINESS_TYPES[0].example,
    [businessType]
  );

  const assembledPersona = useMemo(
    () =>
      personaOverride.trim() ||
      assemblePersona({
        agentName: displayName.trim() || "Assistant",
        about,
        contentTopics: topics,
        offers,
      }),
    [personaOverride, displayName, about, topics, offers]
  );

  const draft = (): OnboardingDraft => ({
    agent_name: displayName,
    business_type: businessType,
    about_text: about,
    content_topics: topics,
    offers_text: offers,
    tone,
    language,
    greeting_message: greeting,
    fallback_message: fallback,
    persona_override: personaOverride.trim() || undefined,
    faqs,
  });

  function stepValid(): boolean {
    switch (step) {
      case 0:
        return !!businessType;
      case 1:
        return displayName.trim().length >= 2 && about.trim().length >= 20;
      case 2:
        return true; // optional colour, not a gate
      case 3:
        return !!tone && !!language;
      case 4:
        return greeting.trim().length > 0;
      case 5:
        return assembledPersona.trim().length >= 60;
      default:
        return false;
    }
  }

  async function next() {
    if (!stepValid()) return;
    if (step < 5) {
      // progressive save so a refresh never loses answers
      setSaving(true);
      const r = await saveAIAgentOnboarding(draft(), false);
      setSaving(false);
      if (r.error) toast.error(r.error);
      setStep(step + 1);
      return;
    }
    // finish: assemble, gate, activate
    setSaving(true);
    const r = await saveAIAgentOnboarding(draft(), true);
    setSaving(false);
    if (r.error || !r.data) {
      toast.error(r.error || "Could not finish setup");
      return;
    }
    toast.success("AI Agent activated! 🚀 It now replies as you.");
    onComplete(r.data);
  }

  async function runTest() {
    const msg = testInput.trim();
    if (!msg || testing) return;
    setTestInput("");
    const history = testMessages;
    setTestMessages([...history, { role: "user", content: msg }]);
    setTesting(true);
    const r = await previewAgentReply(
      {
        agent_name: displayName || "Assistant",
        persona: assembledPersona,
        tone,
        language,
        fallback_message: fallback,
      },
      history,
      msg
    );
    setTesting(false);
    if (r.error || !r.reply) {
      toast.error(r.error || "Test failed — try again");
      return;
    }
    setTestMessages([...history, { role: "user", content: msg }, { role: "assistant", content: r.reply }]);
  }

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testMessages, testing]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl my-8 rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* header + progress */}
          <div className="p-6 sm:p-8 pb-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Set up your AI Agent</h2>
                <p className="text-xs text-muted-foreground">
                  {agent.is_active
                    ? "Your agent is on hold until setup completes — a half-informed agent talks nonsense"
                    : "Takes ~2 minutes. Your agent can't go live without it."}{" "}
                  Start with what you know — you can refine everything anytime.
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 mb-6">
              {STEP_TITLES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < step ? "bg-mint" : i === step ? "bg-mint/60" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* steps */}
          <div className="px-6 sm:px-8 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pb-2"
              >
                <h3 className="text-xl font-bold text-foreground">{STEP_TITLES[step].title}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">{STEP_TITLES[step].sub}</p>

                {/* STEP 0 — business type */}
                {step === 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {BUSINESS_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setBusinessType(t.value)}
                        className={`p-3.5 rounded-2xl border text-left transition-all min-w-0 ${
                          businessType === t.value
                            ? "border-mint bg-mint/10 shadow-sm"
                            : "border-border hover:border-mint/40 hover:bg-muted/40"
                        }`}
                      >
                        <t.icon className={`w-5 h-5 mb-2 ${businessType === t.value ? "text-mint" : "text-muted-foreground"}`} />
                        <span className="text-xs font-semibold text-foreground block leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 1 — who are you */}
                {step === 1 && (
                  <div className="space-y-4">
                    {igName && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                        <AtSign className="w-3.5 h-3.5" />
                        Connected as <span className="font-medium text-foreground">{igName}</span> — we&apos;ll use this to prefill
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Display name <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={igName || "e.g. Vikash"}
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The name your agent uses when followers ask &quot;who is this?&quot;
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        What do you do? <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={3}
                        placeholder={typeExample}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 resize-none"
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-muted-foreground">1–2 lines is plenty — this is who your agent pretends to be</p>
                        <span className={`text-xs ${about.trim().length >= 20 ? "text-mint" : "text-muted-foreground"}`}>
                          {about.trim().length}/20 min
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 — content & offers */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        What do you post about?
                      </label>
                      <textarea
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        rows={2}
                        placeholder="e.g. Budget travel reels, packing hacks, café reviews, weekend getaways"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Comma-separated works great — the agent uses these as safe topics</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        What do you offer? <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={offers}
                        onChange={(e) => setOffers(e.target.value)}
                        rows={3}
                        placeholder={"e.g. Travel planning guide — ₹199 (link in bio), brand collabs — DM 'rates', free packing checklist"}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Products, services, prices, links — everything here is safe for the agent to share
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3 — voice */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-2.5">
                      {TONES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            tone === t.value
                              ? "border-mint bg-mint/10 shadow-sm"
                              : "border-border hover:border-mint/40 hover:bg-muted/40"
                          }`}
                        >
                          <span className="text-sm font-semibold text-foreground block">{t.label}</span>
                          <span className="text-xs text-muted-foreground block mt-0.5 leading-snug">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Reply language</label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.value}
                            onClick={() => setLanguage(l.value)}
                            className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-all ${
                              language === l.value
                                ? "border-mint bg-mint/10 text-foreground"
                                : "border-border text-muted-foreground hover:border-mint/40"
                            }`}
                          >
                            {l.flag} {l.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Auto-detect mirrors whatever language the follower writes in — recommended
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 4 — greeting + fallback + FAQs */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Greeting message</label>
                      <input
                        value={greeting}
                        onChange={(e) => setGreeting(e.target.value)}
                        placeholder={`Hey! 👋 Thanks for reaching out to ${displayName || "us"} — how can I help?`}
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Sent when someone messages you for the first time</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">When it doesn&apos;t know the answer…</label>
                      <input
                        value={fallback}
                        onChange={(e) => setFallback(e.target.value)}
                        placeholder="Good question! Let me check and get back to you shortly. 😊"
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Better to admit than invent — this keeps your agent honest
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Questions people always ask? <span className="text-muted-foreground font-normal">(optional, up to 2)</span>
                      </label>
                      {faqs.map((f, i) => (
                        <div key={i} className="grid sm:grid-cols-2 gap-2 mb-2">
                          <input
                            value={f.question}
                            onChange={(e) =>
                              setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                            }
                            placeholder="e.g. What are your rates?"
                            className="h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                          />
                          <input
                            value={f.answer}
                            onChange={(e) =>
                              setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                            }
                            placeholder="e.g. Collabs start at ₹5k — check the link in bio"
                            className="h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                          />
                        </div>
                      ))}
                      {faqs.length < 2 && (
                        <button
                          onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                          className="text-xs font-medium text-mint hover:underline"
                        >
                          + Add a question
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 5 — review + test */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-mint/25 bg-mint/5 p-3.5">
                      <ShieldCheck className="w-4 h-4 text-mint mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This is exactly what your agent knows about you. It will{" "}
                        <span className="text-foreground font-medium">never invent facts beyond this</span> — edit
                        anything that looks off.
                      </p>
                    </div>
                    <textarea
                      value={personaOverride.trim() || assembledPersona}
                      onChange={(e) => setPersonaOverride(e.target.value)}
                      rows={7}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-mint/50"
                    />

                    {/* test chat */}
                    <p className="text-sm text-muted-foreground -mt-1">
                      Once you&apos;re happy with the replies, make it live 🚀
                    </p>
                    <div className="rounded-2xl border border-border bg-background overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Test your agent</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">not live yet — just a preview</span>
                      </div>
                      <div className="h-48 overflow-y-auto p-4 space-y-2.5">
                        {testMessages.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center pt-12">
                            Try asking &quot;what do you do?&quot; or something a follower would ask
                          </p>
                        )}
                        {testMessages.map((m, i) => (
                          <div
                            key={i}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                                m.role === "user"
                                  ? "bg-mint text-white rounded-br-md"
                                  : "bg-muted text-foreground rounded-bl-md"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))}
                        {testing && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 flex gap-1">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="flex gap-2 p-3 border-t border-border">
                        <input
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && runTest()}
                          placeholder="Type a test message…"
                          className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-mint/50"
                        />
                        <button
                          onClick={runTest}
                          disabled={testing || !testInput.trim()}
                          className="size-10 rounded-xl bg-mint text-white flex items-center justify-center disabled:opacity-50"
                          aria-label="Send test message"
                        >
                          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* footer */}
          <div className="p-6 sm:p-8 pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Step {step + 1} of {STEP_TITLES.length}
              </span>
              <button
                onClick={next}
                disabled={!stepValid() || saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === 5 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {step === 5 ? "Activate agent" : "Continue"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
