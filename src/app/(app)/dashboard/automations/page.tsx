"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Bot,
  Plus,
  Pause,
  Play,
  Trash2,
  MessageCircle,
  Users,
  Search,
  Loader2,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Globe,
  Image as ImageIcon,
  Film,
  Grid3X3,
  Check,
  MessageSquareReply,
  ArrowRight,
  Zap,
  Eye,
  Shield,
  Link2,
  LayoutTemplate,
  Type,
  MousePointerClick,
  ExternalLink,
  Gift,
  Flame,
  CalendarCheck,
  Rocket,
  MessageSquare,
  GitBranch,
  Tag,
  Send,
  FlaskConical,
  Workflow,
} from "lucide-react";
import {
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
} from "@/lib/actions/automations";
import { getInstagramPosts, getInstagramPostByUrl, getInstagramStories } from "@/lib/actions/instagram-api";
import { getPostbackFlows, savePostbackFlows, type PostbackFlow } from "@/lib/actions/postback-flows";
import { toast } from "sonner";
import { DMPreview } from "@/components/dm-preview";
import DripSequenceBuilder from "@/components/dashboard/drip-sequence-builder";
import ABTestPanel from "@/components/dashboard/ab-test-panel";
import PostbackFlowPanel from "@/components/dashboard/postback-flow-panel";
import { AutomationCardSkeleton } from "@/components/ui/page-skeleton";
import { getProfile } from "@/lib/actions/dashboard";
import { canConfigureFollowCheck, type PlanKey } from "@/lib/utils/plan-limits";

interface Automation {
  id: string;
  name: string;
  keyword: string;
  dm_template: string;
  post_url: string | null;
  media_id: string | null;
  scope_type: string;
  content_type: string;
  status: string;
  dms_sent: number;
  leads_captured: number;
  ai_enabled: boolean;
  comment_reply_enabled: boolean;
  comment_reply_template: string | null;
  require_follow: boolean;
  template_type: string;
  template_title: string | null;
  template_subtitle: string | null;
  template_image_url: string | null;
  template_buttons: TemplateButton[];
  created_at: string;
}

interface IGPost {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  permalink: string;
  timestamp: string;
}

interface TemplateButton {
  type: "web_url" | "postback";
  title: string;
  url?: string;
  payload?: string;
}

interface PostbackFlowForm {
  payload: string;
  label: string;
  response_type: "text" | "button";
  response_text: string;
  response_template_title: string;
  response_template_subtitle: string;
  response_template_image_url: string;
  response_template_buttons: { type: "web_url"; title: string; url?: string }[];
  lead_tag: string;
}

// ── Preset Templates ──
const PRESET_TEMPLATES = [
  {
    id: "free_resource",
    name: "🎁 Free Resource",
    icon: Gift,
    color: "emerald",
    title: "Your Free Guide is Ready! 📚",
    subtitle: "Tap below to grab it instantly",
    buttons: [{ type: "web_url" as const, title: "Download Now →", url: "https://example.com" }],
  },
  {
    id: "limited_offer",
    name: "🔥 Limited Offer",
    icon: Flame,
    color: "orange",
    title: "Exclusive Deal for You!",
    subtitle: "Only for our engaged followers",
    buttons: [
      { type: "web_url" as const, title: "Shop Now", url: "https://example.com" },
      { type: "web_url" as const, title: "View Details", url: "https://example.com" },
    ],
  },
  {
    id: "book_call",
    name: "📅 Book a Call",
    icon: CalendarCheck,
    color: "blue",
    title: "Let's Chat, {name}!",
    subtitle: "I'd love to help you with your goals",
    buttons: [
      { type: "web_url" as const, title: "Book Free Call", url: "https://example.com" },
      { type: "web_url" as const, title: "Learn More", url: "https://example.com" },
    ],
  },
  {
    id: "course_launch",
    name: "🚀 Course Launch",
    icon: Rocket,
    color: "purple",
    title: "You're In! 🎉",
    subtitle: "Here's your exclusive early access",
    buttons: [
      { type: "web_url" as const, title: "Start Learning", url: "https://example.com" },
      { type: "web_url" as const, title: "Join Community", url: "https://example.com" },
    ],
  },
  {
    id: "community",
    name: "💬 Community Invite",
    icon: MessageSquare,
    color: "teal",
    title: "Welcome to the Crew!",
    subtitle: "Join our private community",
    buttons: [
      { type: "web_url" as const, title: "Join Now", url: "https://example.com" },
      { type: "web_url" as const, title: "What's Inside?", url: "https://example.com" },
    ],
  },
];

// ── Collapsible Drip Sequence Builder (Bug #8) ──
function DripToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <GitBranch className="w-4 h-4" />
        Drip Sequence
        <span className="text-xs font-normal text-muted-foreground/70 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "2000px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3">
          <DripSequenceBuilder automationId={automationId} userPlan={userPlan as "free" | "starter" | "pro" | "business"} />
        </div>
      </div>
    </div>
  );
}

function ABTestToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <FlaskConical className="w-4 h-4" />
        A/B Testing
        <span className="text-xs font-normal text-muted-foreground/70 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "3000px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3">
          <ABTestPanel automationId={automationId} userPlan={userPlan} />
        </div>
      </div>
    </>
  );
}

function PostbackFlowToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <Workflow className="w-4 h-4" />
        Postback Flows
        <span className="text-xs font-normal text-muted-foreground/70 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "5000px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3">
          <PostbackFlowPanel automationId={automationId} userPlan={userPlan} />
        </div>
      </div>
    </>
  );
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [userPlan, setUserPlan] = useState<PlanKey>("free");
  const canToggleFollow = canConfigureFollowCheck(userPlan);

  // Multi-account state
  const [igAccounts, setIgAccounts] = useState<
    { id: string; ig_username: string; ig_profile_pic: string | null }[]
  >([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [stories, setStories] = useState<IGPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // URL input state
  const [reelUrl, setReelUrl] = useState("");
  const [loadingUrlPost, setLoadingUrlPost] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    keyword: "",
    dm_template: "",
    scope_type: "account" as "account" | "media",
    content_type: "all" as "all" | "reel" | "post",
    media_id: "",
    media_ids: [] as string[],
    post_url: "",
    ai_enabled: false,
    ai_persona: "",
    comment_reply_enabled: false,
    comment_reply_template: "",
    require_follow: true, // Default ON — free users can't change this
    template_type: "text" as "text" | "button",
    template_title: "",
    template_subtitle: "",
    template_image_url: "",
    template_buttons: [] as TemplateButton[],
    trigger_type: "comment_trigger" as "comment_trigger" | "story_reply" | "both",
    instagram_account_id: "",
  });
  const [postbackFlows, setPostbackFlows] = useState<PostbackFlowForm[]>([]);

  function updatePostbackFlow(payload: string, field: string, value: string) {
    setPostbackFlows((prev) => {
      const idx = prev.findIndex((f) => f.payload === payload);
      if (idx >= 0) {
        const updated = [...prev];
        if (field === "response_template_buttons") {
          try {
            updated[idx] = { ...updated[idx], [field]: JSON.parse(value) };
          } catch {
            // invalid JSON, skip
          }
        } else {
          updated[idx] = { ...updated[idx], [field]: value };
        }
        return updated;
      }
      // Create new flow entry
      const newFlow: PostbackFlowForm = {
        payload,
        label: formData.template_buttons.find((b) => b.payload === payload)?.title || payload,
        response_type: field === "response_type" ? (value as "text" | "button") : "text",
        response_text: field === "response_text" ? value : "",
        response_template_title: field === "response_template_title" ? value : "",
        response_template_subtitle: field === "response_template_subtitle" ? value : "",
        response_template_image_url: field === "response_template_image_url" ? value : "",
        response_template_buttons: field === "response_template_buttons" ? JSON.parse(value) : [],
        lead_tag: field === "lead_tag" ? value : "",
      };
      return [...prev, newFlow];
    });
  }

  useEffect(() => {
    loadAutomations();
    // Load user plan for feature gating
    getProfile().then((profile) => {
      if (profile) {
        const plan = (profile.plan || "free") as PlanKey;
        setUserPlan(plan);
        // Free users: force require_follow = true
        if (!canConfigureFollowCheck(plan)) {
          setFormData((f) => ({ ...f, require_follow: true }));
        }
      }
    });
    // Load connected IG accounts for selector
    import("@/lib/actions/ig-accounts").then(({ getIGAccounts }) => {
      getIGAccounts().then((data) => {
        setIgAccounts(
          data.accounts.map((a) => ({
            id: a.id,
            ig_username: a.ig_username,
            ig_profile_pic: a.ig_profile_pic,
          }))
        );
        // Default to first account
        if (data.accounts.length > 0) {
          setFormData((f) => ({ ...f, instagram_account_id: data.accounts[0].id }));
        }
      });
    });
  }, []);

  async function loadAutomations() {
    setLoading(true);
    const { data } = await getAutomations();
    setAutomations((data as Automation[]) ?? []);
    setLoading(false);
  }

  const filtered = automations.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.keyword.toLowerCase().includes(search.toLowerCase())
  );

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    const { data, nextCursor: cursor } = await getInstagramPosts();
    setPosts(data);
    setNextCursor(cursor);
    setLoadingPosts(false);
  }, []);

  const loadStories = useCallback(async () => {
    setLoadingStories(true);
    const { data } = await getInstagramStories();
    setStories(data);
    setLoadingStories(false);
  }, []);

  async function loadMorePosts() {
    if (!nextCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    const { data, nextCursor: cursor } = await getInstagramPosts(nextCursor);
    setPosts((prev) => [...prev, ...data]);
    setNextCursor(cursor);
    setLoadingMorePosts(false);
  }

  async function handleLoadUrlPost() {
    if (!reelUrl.trim()) return;
    setLoadingUrlPost(true);
    const { data, error } = await getInstagramPostByUrl(reelUrl.trim());
    if (error) {
      toast.error(error);
    } else if (data) {
      // Prepend the found post if it's not already in the list
      setPosts((prev) => {
        if (prev.find((p) => p.id === data.id)) return prev;
        return [data, ...prev];
      });
      setFormData((f) => ({
        ...f,
        media_id: data.id,
        post_url: data.permalink,
      }));
      setReelUrl("");
      toast.success("Post found and selected! ✅");
    }
    setLoadingUrlPost(false);
  }

  function openWizard() {
    setFormData({
      name: "",
      keyword: "",
      dm_template: "",
      scope_type: "account",
      content_type: "all",
      media_id: "",
      media_ids: [],
      post_url: "",
      ai_enabled: false,
      ai_persona: "",
      comment_reply_enabled: false,
      comment_reply_template: "",
      require_follow: false,
      template_type: "text",
      template_title: "",
      template_subtitle: "",
      template_image_url: "",
      template_buttons: [],
      trigger_type: "comment_trigger",
      instagram_account_id: igAccounts.length > 0 ? igAccounts[0].id : "",
    });
    setReelUrl("");
    setStep(1);
    setShowCreate(true);
    loadPosts();
    loadStories();
  }

  function applyPreset(preset: typeof PRESET_TEMPLATES[0]) {
    setFormData((f) => ({
      ...f,
      template_type: "button",
      template_title: preset.title,
      template_subtitle: preset.subtitle,
      template_buttons: preset.buttons.map((b) => ({ ...b })),
    }));
    toast.success(`"${preset.name}" template applied!`);
  }

  function addButton() {
    if (formData.template_buttons.length >= 3) {
      toast.error("Maximum 3 buttons allowed");
      return;
    }
    setFormData((f) => ({
      ...f,
      template_buttons: [
        ...f.template_buttons,
        { type: "web_url", title: "", url: "" },
      ],
    }));
  }

  function removeButton(index: number) {
    setFormData((f) => ({
      ...f,
      template_buttons: f.template_buttons.filter((_, i) => i !== index),
    }));
  }

  function updateButton(index: number, field: string, value: string) {
    setFormData((f) => ({
      ...f,
      template_buttons: f.template_buttons.map((btn, i) =>
        i === index ? { ...btn, [field]: value } : btn
      ),
    }));
  }

  function canGoNext(): boolean {
    if (step === 1) {
      return (
        formData.name.trim().length > 0 &&
        formData.keyword.trim().length > 0 &&
        (formData.scope_type === "account" || formData.media_id.length > 0 || formData.media_ids.length > 0)
      );
    }
    if (step === 2) {
      if (formData.template_type === "button") {
        return (
          formData.template_title.trim().length > 0 &&
          formData.template_buttons.length > 0 &&
          formData.template_buttons.every(
            (b) => b.title.trim().length > 0 && (
              b.type === "web_url" ? (b.url?.trim().length ?? 0) > 0 :
              b.type === "postback" ? (b.payload?.trim().length ?? 0) > 0 : true
            )
          )
        );
      }
      return formData.dm_template.trim().length > 0;
    }
    return true;
  }

  async function handleCreate() {
    setCreating(true);
    const fd = new FormData();
    fd.set("name", formData.name);
    fd.set("keyword", formData.keyword);
    fd.set("dm_template", formData.dm_template);
    fd.set("scope_type", formData.scope_type);
    fd.set("content_type", formData.content_type);
    fd.set("media_id", formData.media_ids.length > 0 ? formData.media_ids.join(",") : formData.media_id);
    fd.set("post_url", formData.post_url);
    fd.set("ai_enabled", formData.ai_enabled ? "true" : "false");
    fd.set("ai_persona", formData.ai_persona);
    fd.set(
      "comment_reply_enabled",
      formData.comment_reply_enabled ? "true" : "false"
    );
    fd.set("comment_reply_template", formData.comment_reply_template);
    fd.set("require_follow", formData.require_follow ? "true" : "false");
    fd.set("template_type", formData.template_type);
    fd.set("template_title", formData.template_title);
    fd.set("template_subtitle", formData.template_subtitle);
    fd.set("template_image_url", formData.template_image_url);
    fd.set("template_buttons", JSON.stringify(formData.template_buttons));
    fd.set("trigger_type", formData.trigger_type);
    if (formData.instagram_account_id) {
      fd.set("instagram_account_id", formData.instagram_account_id);
    }

    const result = await createAutomation(fd);
    if (result.error) {
      toast.error(result.error);
    } else {
      // Save postback flows if any
      const postbackButtons = formData.template_buttons.filter((b) => b.type === "postback" && b.payload);
      if (postbackButtons.length > 0 && postbackFlows.length > 0 && result.id) {
        const flowsToSave = postbackFlows
          .filter((f) => postbackButtons.some((b) => b.payload === f.payload))
          .map((f) => ({
            ...f,
            label: f.label || formData.template_buttons.find((b) => b.payload === f.payload)?.title || f.payload,
          }));

        if (flowsToSave.length > 0) {
          const flowResult = await savePostbackFlows(result.id, flowsToSave);
          if (flowResult.error) {
            toast.error(`Automation created but flows failed: ${flowResult.error}`);
          } else {
            toast.success(`Automation created with ${flowsToSave.length} postback flow(s)! 🚀`);
          }
        } else {
          toast.success("Automation created successfully! 🚀");
        }
      } else {
        toast.success("Automation created successfully! 🚀");
      }
      setShowCreate(false);
      setPostbackFlows([]);
      loadAutomations();
    }
    setCreating(false);
  }

  async function handleToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const result = await toggleAutomation(
      id,
      newStatus as "active" | "paused"
    );
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        newStatus === "active" ? "Automation resumed" : "Automation paused"
      );
      loadAutomations();
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteAutomation(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Automation deleted");
      loadAutomations();
    }
  }

  const selectedPost = posts.find((p) => p.id === formData.media_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create keyword-triggered DM automations for your Instagram posts.
          </p>
        </div>
        <button
          onClick={openWizard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.19_162/20%)] hover:shadow-xl hover:shadow-[oklch(0.52_0.19_162/30%)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search automations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
        />
      </div>

      {/* Automation Cards */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <AutomationCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-[oklch(0.52_0.19_162)]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {search ? "No automations match your search" : "No automations yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? "Try a different search term."
              : "Create your first automation to start sending DMs when someone comments a keyword on your post."}
          </p>
          {!search && (
            <button
              onClick={openWizard}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Your First Automation
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden"
            >
              {/* ── Row 1: Title + Status + Actions ── */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                {/* Status dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    a.status === "active"
                      ? "bg-green-500 shadow-[0_0_6px_oklch(0.52_0.19_162/40%)]"
                      : "bg-amber-400"
                  }`}
                />
                <h3 className="text-base font-semibold text-foreground truncate flex-1">
                  {a.name}
                </h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    a.status === "active"
                      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                      : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                  }`}
                >
                  {a.status === "active" ? "Active" : "Paused"}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => handleToggle(a.id, a.status)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      a.status === "active"
                        ? "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                    }`}
                    title={a.status === "active" ? "Pause" : "Resume"}
                  >
                    {a.status === "active" ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Row 2: Trigger + Features info ── */}
              <div className="px-5 pb-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                {/* Keyword trigger */}
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {(a.keyword || "").trim() === "*" ? (
                    <span className="font-medium text-amber-600 dark:text-amber-400">All Comments</span>
                  ) : (
                    <>
                      {(a.keyword || "").split(",").map((kw, i) => (
                        <span
                          key={i}
                          className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </>
                  )}
                </span>
                <span className="text-muted-foreground/40">·</span>
                {/* Scope */}
                <span>
                  {a.scope_type === "media" ? "Specific post" : "All posts"}
                </span>
                {/* Feature indicators */}
                {a.template_type === "button" && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <LayoutTemplate className="w-3 h-3" /> Buttons
                    </span>
                  </>
                )}
                {a.comment_reply_enabled && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MessageSquareReply className="w-3 h-3" /> Reply
                    </span>
                  </>
                )}
                {a.ai_enabled && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-3 h-3" /> AI
                    </span>
                  </>
                )}
                {a.require_follow && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Follow gate
                    </span>
                  </>
                )}
              </div>

              {/* ── Row 3: Stats ── */}
              <div className="px-5 pb-4 flex items-center gap-5">
                <div className="flex items-center gap-1.5 text-sm" title="DMs sent">
                  <div className="w-6 h-6 rounded-md bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center">
                    <Send className="w-3 h-3 text-[oklch(0.52_0.19_162)]" />
                  </div>
                  <span className="font-semibold text-foreground">{a.dms_sent}</span>
                  <span className="text-xs text-muted-foreground">sent</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm" title="Leads captured">
                  <div className="w-6 h-6 rounded-md bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center">
                    <Users className="w-3 h-3 text-[oklch(0.52_0.19_162)]" />
                  </div>
                  <span className="font-semibold text-foreground">{a.leads_captured}</span>
                  <span className="text-xs text-muted-foreground">leads</span>
                </div>
              </div>

              {/* ── Accordion sections ── */}
              <div className="border-t border-border px-5 py-3 space-y-0">
                <DripToggle automationId={a.id} userPlan={userPlan} />
                <div className="mt-3 pt-3 border-t border-border/50">
                  <ABTestToggle automationId={a.id} userPlan={userPlan} />
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <PostbackFlowToggle automationId={a.id} userPlan={userPlan} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* CREATE AUTOMATION WIZARD MODAL                     */}
      {/* ═══════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative">
            {/* Close button */}
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Wizard Header */}
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-foreground">
                Create Automation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set up a keyword-triggered DM automation in 3 easy steps.
              </p>

              {/* Step Indicators */}
              <div className="flex items-center gap-2 mt-5">
                {[
                  { num: 1, label: "Trigger" },
                  { num: 2, label: "Response" },
                  { num: 3, label: "Review" },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                        step === s.num
                          ? "bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white shadow-lg shadow-[oklch(0.52_0.19_162/25%)]"
                          : step > s.num
                          ? "bg-[oklch(0.52_0.19_162)] text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:block ${
                        step >= s.num
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.num < 3 && (
                      <div
                        className={`flex-1 h-0.5 rounded-full ${
                          step > s.num
                            ? "bg-[oklch(0.52_0.19_162)]"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6">
              {/* ─── STEP 1: TRIGGER SETUP ─── */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Automation Name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Automation Name
                    </label>
                    <input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. Free Guide Giveaway"
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                    />
                  </div>

                  {/* Account Selector (multi-account) */}
                  {igAccounts.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Instagram Account
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {igAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() =>
                              setFormData((f) => ({ ...f, instagram_account_id: acc.id }))
                            }
                            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                              formData.instagram_account_id === acc.id
                                ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            {acc.ig_profile_pic ? (
                              <img
                                src={acc.ig_profile_pic}
                                alt={acc.ig_username}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center">
                                <span className="text-xs font-bold text-muted-foreground">
                                  {acc.ig_username[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground truncate">
                              @{acc.ig_username}
                            </span>
                            {formData.instagram_account_id === acc.id && (
                              <Check className="w-4 h-4 text-[oklch(0.52_0.19_162)] ml-auto shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trigger Type Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Trigger Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "comment_trigger", label: "💬 Comments", desc: "Keyword comments" },
                        { value: "story_reply", label: "📸 Story Replies", desc: "Story mentions" },
                        { value: "both", label: "⚡ Both", desc: "Comments + Stories" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData((f) => ({
                              ...f,
                              trigger_type: opt.value as "comment_trigger" | "story_reply" | "both",
                            }))
                          }
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.trigger_type === opt.value
                              ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <p className="text-sm font-semibold text-foreground">
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trigger Keywords */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Trigger Keywords
                    </label>
                    <input
                      value={formData.keyword}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, keyword: e.target.value }))
                      }
                      placeholder="e.g. FREE, GUIDE, LINK  or  *  for all comments"
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated. Use <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground">*</code> to trigger on <strong>every comment</strong> regardless of what they type.
                    </p>
                  </div>

                  {/* Scope: All vs Specific — contextual based on trigger type */}
                  {formData.trigger_type !== "story_reply" && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Where should this trigger?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((f) => ({
                              ...f,
                              scope_type: "account",
                              media_id: "",
                              post_url: "",
                            }))
                          }
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.scope_type === "account"
                              ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <Globe
                            className={`w-5 h-5 mb-2 ${
                              formData.scope_type === "account"
                                ? "text-[oklch(0.52_0.19_162)]"
                                : "text-muted-foreground"
                            }`}
                          />
                          <p className="text-sm font-semibold text-foreground">
                            All Posts
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Trigger on any post or reel
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((f) => ({ ...f, scope_type: "media" }))
                          }
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.scope_type === "media"
                              ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <ImageIcon
                            className={`w-5 h-5 mb-2 ${
                              formData.scope_type === "media"
                                ? "text-[oklch(0.52_0.19_162)]"
                                : "text-muted-foreground"
                            }`}
                          />
                          <p className="text-sm font-semibold text-foreground">
                            Specific Post
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Choose a post from your feed
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Story Picker — shown when trigger_type is story_reply or both */}
                  {(formData.trigger_type === "story_reply" || formData.trigger_type === "both") && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Active Stories
                      </label>
                      {loadingStories ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading your stories...
                          </span>
                        </div>
                      ) : stories.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-border">
                          <Film className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground mb-1">
                            No active stories
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stories only appear here while they&apos;re live (24h window).
                            This automation will still trigger on any future story replies.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto rounded-xl border border-border p-2 bg-background">
                          {stories.map((story) => (
                            <button
                              type="button"
                              key={story.id}
                              onClick={() =>
                                setFormData((f) => ({
                                  ...f,
                                  scope_type: "media",
                                  media_id: story.id,
                                  post_url: story.permalink,
                                }))
                              }
                              className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all group ${
                                formData.media_id === story.id
                                  ? "border-[oklch(0.52_0.19_162)] ring-2 ring-[oklch(0.52_0.19_162/30%)]"
                                  : "border-transparent hover:border-muted-foreground/30"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  story.media_type === "VIDEO"
                                    ? story.thumbnail_url
                                    : story.media_url
                                }
                                alt="Story"
                                className="w-full h-full object-cover"
                              />
                              {story.media_type === "VIDEO" && (
                                <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                                  <Film className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {formData.media_id === story.id && (
                                <div className="absolute inset-0 bg-[oklch(0.52_0.19_162/20%)] flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-[oklch(0.52_0.19_162)] flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        💡 Selecting a story is optional — leaving none selected means this automation triggers on <strong>all</strong> story replies.
                      </p>
                    </div>
                  )}

                  {/* Content Type Filter (for account scope, only for comment triggers) */}
                  {formData.scope_type === "account" && formData.trigger_type !== "story_reply" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Content Type
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "all", icon: Grid3X3, label: "All" },
                          { value: "post", icon: ImageIcon, label: "Posts" },
                          { value: "reel", icon: Film, label: "Reels" },
                        ].map((ct) => (
                          <button
                            type="button"
                            key={ct.value}
                            onClick={() =>
                              setFormData((f) => ({
                                ...f,
                                content_type: ct.value as typeof f.content_type,
                              }))
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                              formData.content_type === ct.value
                                ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/8%)] text-[oklch(0.52_0.19_162)]"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <ct.icon className="w-3.5 h-3.5" />
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post Picker Grid + URL Input */}
                  {formData.scope_type === "media" && formData.trigger_type !== "story_reply" && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Select Posts {formData.media_ids.length > 0 && <span className="text-xs font-normal text-[oklch(0.52_0.19_162)] ml-1">({formData.media_ids.length} selected)</span>}
                      </label>

                      {/* ── URL Input for older posts ── */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            value={reelUrl}
                            onChange={(e) => setReelUrl(e.target.value)}
                            placeholder="Paste a reel/post URL to load older content..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                            onKeyDown={(e) => e.key === "Enter" && handleLoadUrlPost()}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleLoadUrlPost}
                          disabled={loadingUrlPost || !reelUrl.trim()}
                          className="h-10 px-4 rounded-lg bg-[oklch(0.52_0.19_162)] text-white text-sm font-medium hover:bg-[oklch(0.48_0.19_162)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {loadingUrlPost ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          Load
                        </button>
                      </div>

                      {loadingPosts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading your posts...
                          </span>
                        </div>
                      ) : posts.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-border">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No posts found. Make sure your Instagram is
                            connected.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto rounded-xl border border-border p-2 bg-background">
                            {posts.map((post) => (
                              <button
                                type="button"
                                key={post.id}
                                onClick={() =>
                                  setFormData((f) => {
                                    const ids = f.media_ids.includes(post.id)
                                      ? f.media_ids.filter((id) => id !== post.id)
                                      : [...f.media_ids, post.id];
                                    return {
                                      ...f,
                                      media_ids: ids,
                                      media_id: ids[0] || "",
                                      post_url: post.permalink,
                                    };
                                  })
                                }
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                  formData.media_ids.includes(post.id)
                                    ? "border-[oklch(0.52_0.19_162)] ring-2 ring-[oklch(0.52_0.19_162/30%)]"
                                    : "border-transparent hover:border-muted-foreground/30"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    post.media_type === "VIDEO"
                                      ? post.thumbnail_url
                                      : post.media_url
                                  }
                                  alt={post.caption?.slice(0, 50) || "Post"}
                                  className="w-full h-full object-cover"
                                />
                                {post.media_type === "VIDEO" && (
                                  <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                                    <Film className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                {formData.media_ids.includes(post.id) && (
                                  <div className="absolute inset-0 bg-[oklch(0.52_0.19_162/20%)] flex items-center justify-center">
                                    <div className="w-7 h-7 rounded-full bg-[oklch(0.52_0.19_162)] flex items-center justify-center">
                                      <Check className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-[10px] text-white truncate">
                                    {post.caption?.slice(0, 40) || "No caption"}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Load More Button */}
                          {nextCursor && (
                            <button
                              type="button"
                              onClick={loadMorePosts}
                              disabled={loadingMorePosts}
                              className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                            >
                              {loadingMorePosts ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : null}
                              {loadingMorePosts ? "Loading..." : `Load More Posts (${posts.length} shown)`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 2: RESPONSE CONFIG ─── */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* ── Template Type Selector ── */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Message Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, template_type: "text" }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.template_type === "text"
                            ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <Type className={`w-5 h-5 mb-2 ${formData.template_type === "text" ? "text-[oklch(0.52_0.19_162)]" : "text-muted-foreground"}`} />
                        <p className="text-sm font-semibold text-foreground">Plain Text</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Simple text message</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, template_type: "button" }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.template_type === "button"
                            ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)] shadow-sm"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <MousePointerClick className={`w-5 h-5 mb-2 ${formData.template_type === "button" ? "text-[oklch(0.52_0.19_162)]" : "text-muted-foreground"}`} />
                        <p className="text-sm font-semibold text-foreground">Button Card</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Rich card with CTA buttons</p>
                      </button>
                    </div>
                  </div>

                  {/* ── Plain Text Template ── */}
                  {formData.template_type === "text" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        DM Message Template
                      </label>
                      <textarea
                        value={formData.dm_template}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            dm_template: e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Hey {name}! 👋 Here's your free guide..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent resize-none"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Variables:
                        </span>
                        {["{name}", "{keyword}"].map((v) => (
                          <button
                            type="button"
                            key={v}
                            onClick={() =>
                              setFormData((f) => ({
                                ...f,
                                dm_template: f.dm_template + ` ${v}`,
                              }))
                            }
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-mono text-foreground hover:bg-muted/80 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Button Template Builder ── */}
                  {formData.template_type === "button" && (
                    <div className="space-y-4">
                      {/* Preset Templates */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Quick Presets
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {PRESET_TEMPLATES.map((preset) => (
                            <button
                              type="button"
                              key={preset.id}
                              onClick={() => applyPreset(preset)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 hover:border-muted-foreground/30 transition-all whitespace-nowrap shrink-0"
                            >
                              <preset.icon className="w-3.5 h-3.5" />
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Card Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={formData.template_title}
                          onChange={(e) => setFormData((f) => ({ ...f, template_title: e.target.value.slice(0, 80) }))}
                          placeholder="e.g. Your Free Guide is Ready! 📚"
                          maxLength={80}
                          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                        />
                        <p className="text-xs text-muted-foreground">{formData.template_title.length}/80 characters</p>
                      </div>

                      {/* Subtitle */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Subtitle <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <input
                          value={formData.template_subtitle}
                          onChange={(e) => setFormData((f) => ({ ...f, template_subtitle: e.target.value.slice(0, 80) }))}
                          placeholder="e.g. Tap below to grab it instantly"
                          maxLength={80}
                          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                        />
                      </div>

                      {/* Image URL */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Image URL <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <input
                          value={formData.template_image_url}
                          onChange={(e) => setFormData((f) => ({ ...f, template_image_url: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                        />
                      </div>

                      {/* Buttons Builder */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">
                            Buttons <span className="text-red-400">*</span>
                          </label>
                          <span className="text-xs text-muted-foreground">{formData.template_buttons.length}/3</span>
                        </div>

                        {formData.template_buttons.map((btn, i) => (
                          <div key={i} className="p-3 rounded-xl border border-border bg-background space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Button {i + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeButton(i)}
                                className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex gap-2">
                              {/* Type Selector */}
                              <select
                                value={btn.type}
                                onChange={(e) => updateButton(i, "type", e.target.value)}
                                className="h-9 px-2 rounded-lg border border-border bg-muted/30 text-xs focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] cursor-pointer"
                              >
                                <option value="web_url">🔗 URL</option>
                                <option value="postback">⚡ Postback</option>
                              </select>
                              <input
                                value={btn.title}
                                onChange={(e) => updateButton(i, "title", e.target.value.slice(0, 20))}
                                placeholder="Button label (max 20)"
                                maxLength={20}
                                className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
                              />
                            </div>

                            {btn.type === "web_url" ? (
                              <input
                                value={btn.url || ""}
                                onChange={(e) => updateButton(i, "url", e.target.value)}
                                placeholder="https://your-link.com"
                                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
                              />
                            ) : (
                              <div className="space-y-1.5">
                                <input
                                  value={btn.payload || ""}
                                  onChange={(e) => updateButton(i, "payload", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                  placeholder="e.g. interest_course"
                                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
                                />
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" />
                                  Configure what happens when tapped in the Postback Flows section below
                                </p>
                              </div>
                            )}
                          </div>
                        ))}

                        {formData.template_buttons.length < 3 && (
                          <button
                            type="button"
                            onClick={addButton}
                            className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            Add Button
                          </button>
                        )}
                      </div>

                      {/* DM Template (fallback text for button type) */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Fallback Text <span className="text-muted-foreground">(shown if template fails)</span>
                        </label>
                        <textarea
                          value={formData.dm_template}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              dm_template: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Hey {name}! 👋 Here's your free guide: https://..."
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Live Preview */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Live Preview
                        </label>
                        <div className="rounded-xl border border-border bg-gradient-to-b from-muted/30 to-background p-4">
                          <div className="max-w-[280px] mx-auto">
                            <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card">
                              {formData.template_image_url && (
                                <div className="h-32 bg-muted flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={formData.template_image_url}
                                    alt="Template preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                              <div className="p-3.5">
                                <p className="text-sm font-bold text-foreground">
                                  {formData.template_title || "Card Title"}
                                </p>
                                {formData.template_subtitle && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formData.template_subtitle}
                                  </p>
                                )}
                              </div>
                              {formData.template_buttons.length > 0 && (
                                <div className="border-t border-border">
                                  {formData.template_buttons.map((btn, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-[oklch(0.52_0.19_162)] border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                    >
                                      {btn.type === "web_url" ? (
                                        <ExternalLink className="w-3 h-3" />
                                      ) : (
                                        <MousePointerClick className="w-3 h-3" />
                                      )}
                                      {btn.title || "Button"}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-2">
                              📱 Best viewed on mobile — desktop shows fallback
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Follow-for-DM Toggle ── */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.require_follow
                        ? "border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-cyan-500" />
                          Follow-for-DM
                          {!canToggleFollow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold ml-1">PRO</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {canToggleFollow
                            ? "Only send DMs to users who follow your account"
                            : "Followers only (upgrade to Pro to disable)"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canToggleFollow}
                        onClick={() => {
                          if (!canToggleFollow) {
                            toast.info("Upgrade to Pro to configure Follow-Check");
                            return;
                          }
                          setFormData((f) => ({
                            ...f,
                            require_follow: !f.require_follow,
                          }));
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          !canToggleFollow
                            ? "bg-cyan-500 opacity-60 cursor-not-allowed"
                            : formData.require_follow
                              ? "bg-cyan-500"
                              : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            formData.require_follow
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    {formData.require_follow && (
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2 bg-cyan-50 dark:bg-cyan-950/30 px-3 py-1.5 rounded-lg">
                        ⚡ Non-followers will be skipped. Uses the Instagram User Profile API to verify.
                      </p>
                    )}
                  </div>

                  {/* AI Smart Replies */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.ai_enabled
                        ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          AI Smart Replies
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          AI personalizes each DM based on the comment context
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((f) => ({
                            ...f,
                            ai_enabled: !f.ai_enabled,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          formData.ai_enabled
                            ? "bg-purple-500"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            formData.ai_enabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    {formData.ai_enabled && (
                      <div className="mt-3 space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          AI Persona (optional)
                        </label>
                        <input
                          value={formData.ai_persona}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              ai_persona: e.target.value,
                            }))
                          }
                          placeholder="e.g. Friendly fitness coach who uses emojis"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Comment Auto-Reply */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.comment_reply_enabled
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <MessageSquareReply className="w-4 h-4 text-blue-500" />
                          Comment Auto-Reply
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Publicly reply to the comment (in addition to the DM)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((f) => ({
                            ...f,
                            comment_reply_enabled: !f.comment_reply_enabled,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          formData.comment_reply_enabled
                            ? "bg-blue-500"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            formData.comment_reply_enabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    {formData.comment_reply_enabled && (
                      <div className="mt-3 space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Reply Message
                        </label>
                        <input
                          value={formData.comment_reply_template}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              comment_reply_template: e.target.value,
                            }))
                          }
                          placeholder="e.g. Check your DMs {name}! 📩"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use {"{name}"} for the commenter&apos;s username.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── iPhone DM Preview ── */}
                  <DMPreview
                    senderUsername={formData.name || "your_brand"}
                    templateType={formData.template_type as "text" | "button"}
                    messageText={formData.dm_template}
                    templateTitle={formData.template_title}
                    templateSubtitle={formData.template_subtitle}
                    templateImageUrl={formData.template_image_url}
                    templateButtons={formData.template_buttons}
                  />

                  {/* ── Postback Flows Builder ── */}
                  {formData.template_type === "button" &&
                    formData.template_buttons.some((b) => b.type === "postback") && (
                    <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
                        <GitBranch className="w-4 h-4 text-amber-500" />
                        <h4 className="text-sm font-semibold text-foreground">Postback Flows</h4>
                        <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          PREMIUM
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Configure what happens when a user taps each postback button. Each flow can send a text reply or another rich card.
                        </p>

                        {formData.template_buttons
                          .filter((b) => b.type === "postback" && b.payload)
                          .map((btn) => {
                            const existingFlow = postbackFlows.find(
                              (f) => f.payload === btn.payload
                            );
                            return (
                              <div
                                key={btn.payload}
                                className="p-3 rounded-xl border border-border bg-background space-y-3"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">
                                      &quot;{btn.title || "Untitled"}&quot; tapped
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      payload: <code className="bg-muted px-1 rounded">{btn.payload}</code>
                                    </p>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
                                </div>

                                {/* Response Type */}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updatePostbackFlow(btn.payload!, "response_type", "text")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      (existingFlow?.response_type || "text") === "text"
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                        : "bg-muted/30 text-muted-foreground border border-border"
                                    }`}
                                  >
                                    💬 Text Reply
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updatePostbackFlow(btn.payload!, "response_type", "button")}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      existingFlow?.response_type === "button"
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                        : "bg-muted/30 text-muted-foreground border border-border"
                                    }`}
                                  >
                                    🃏 Card + Buttons
                                  </button>
                                </div>

                                {/* Text Response */}
                                {(existingFlow?.response_type || "text") === "text" && (
                                  <textarea
                                    value={existingFlow?.response_text || ""}
                                    onChange={(e) => updatePostbackFlow(btn.payload!, "response_text", e.target.value)}
                                    placeholder="Type the response message..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                )}

                                {/* Button Template Response */}
                                {existingFlow?.response_type === "button" && (
                                  <div className="space-y-2">
                                    <input
                                      value={existingFlow.response_template_title || ""}
                                      onChange={(e) => updatePostbackFlow(btn.payload!, "response_template_title", e.target.value)}
                                      placeholder="Card title"
                                      className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <input
                                      value={existingFlow.response_template_subtitle || ""}
                                      onChange={(e) => updatePostbackFlow(btn.payload!, "response_template_subtitle", e.target.value)}
                                      placeholder="Card subtitle (optional)"
                                      className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <input
                                      value={existingFlow.response_template_image_url || ""}
                                      onChange={(e) => updatePostbackFlow(btn.payload!, "response_template_image_url", e.target.value)}
                                      placeholder="Image URL (optional)"
                                      className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    {/* Flow buttons — only URL type for simplicity */}
                                    {(existingFlow.response_template_buttons || []).map((fb, fi) => (
                                      <div key={fi} className="flex gap-2 items-center">
                                        <input
                                          value={fb.title}
                                          onChange={(e) => {
                                            const newBtns = [...(existingFlow.response_template_buttons || [])];
                                            newBtns[fi] = { ...newBtns[fi], title: e.target.value.slice(0, 20) };
                                            updatePostbackFlow(btn.payload!, "response_template_buttons", JSON.stringify(newBtns));
                                          }}
                                          placeholder="Button label"
                                          maxLength={20}
                                          className="flex-1 h-7 px-2 rounded border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                        <input
                                          value={fb.url || ""}
                                          onChange={(e) => {
                                            const newBtns = [...(existingFlow.response_template_buttons || [])];
                                            newBtns[fi] = { ...newBtns[fi], url: e.target.value };
                                            updatePostbackFlow(btn.payload!, "response_template_buttons", JSON.stringify(newBtns));
                                          }}
                                          placeholder="https://link"
                                          className="flex-1 h-7 px-2 rounded border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newBtns = (existingFlow.response_template_buttons || []).filter((_, j) => j !== fi);
                                            updatePostbackFlow(btn.payload!, "response_template_buttons", JSON.stringify(newBtns));
                                          }}
                                          className="p-0.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                    {(existingFlow.response_template_buttons || []).length < 3 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newBtns = [...(existingFlow.response_template_buttons || []), { type: "web_url" as const, title: "", url: "" }];
                                          updatePostbackFlow(btn.payload!, "response_template_buttons", JSON.stringify(newBtns));
                                        }}
                                        className="w-full py-1.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors flex items-center justify-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Add URL Button
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Lead Tag */}
                                <div className="flex items-center gap-2">
                                  <Tag className="w-3 h-3 text-muted-foreground" />
                                  <input
                                    value={existingFlow?.lead_tag || ""}
                                    onChange={(e) => updatePostbackFlow(btn.payload!, "lead_tag", e.target.value)}
                                    placeholder="Lead tag (e.g. interested_course)"
                                    className="flex-1 h-7 px-2 rounded border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                              </div>
                            );
                          })}

                        {formData.template_buttons.filter((b) => b.type === "postback" && !b.payload).length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/30 px-3 py-2 rounded-lg flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            Add a payload to your postback buttons above to configure their flows here
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 3: REVIEW ─── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {formData.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Ready to activate
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {/* Keywords */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <ArrowRight className="w-4 h-4 text-[oklch(0.52_0.19_162)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Trigger Keywords
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.keyword.split(",").map((kw, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 rounded-md bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-xs font-mono font-medium"
                              >
                                {kw.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Scope */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Eye className="w-4 h-4 text-[oklch(0.52_0.19_162)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Scope
                          </p>
                          <p className="text-sm text-foreground mt-0.5">
                            {formData.scope_type === "media"
                              ? `Specific post${selectedPost ? ` — "${selectedPost.caption?.slice(0, 40)}..."` : ""}`
                              : `All ${formData.content_type === "all" ? "posts & reels" : formData.content_type + "s"}`}
                          </p>
                        </div>
                      </div>

                      {/* DM Preview */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <MessageCircle className="w-4 h-4 text-[oklch(0.52_0.19_162)] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {formData.template_type === "button" ? "Button Template" : "DM Message"}
                          </p>
                          {formData.template_type === "button" ? (
                            <div className="mt-1">
                              <p className="text-sm font-medium text-foreground">{formData.template_title}</p>
                              {formData.template_subtitle && <p className="text-xs text-muted-foreground">{formData.template_subtitle}</p>}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {formData.template_buttons.map((btn, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-xs font-medium">
                                    {btn.type === "web_url" ? <ExternalLink className="w-3 h-3" /> : <MousePointerClick className="w-3 h-3" />}
                                    {btn.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                              {formData.dm_template || "No template set"}
                            </p>
                          )}
                          {formData.ai_enabled && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
                              <Sparkles className="w-3 h-3" />
                              AI will personalize this
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features Summary */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Zap className="w-4 h-4 text-[oklch(0.52_0.19_162)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Features
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {formData.require_follow && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium">
                                <Shield className="w-3 h-3" />
                                Follow Required
                              </span>
                            )}
                            {formData.comment_reply_enabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                <MessageSquareReply className="w-3 h-3" />
                                Comment Reply
                              </span>
                            )}
                            {!formData.require_follow && !formData.comment_reply_enabled && (
                              <span className="text-xs text-muted-foreground">No extra features enabled</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="p-6 pt-0 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canGoNext()}
                  className="flex items-center gap-1.5 h-11 px-6 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.19_162/20%)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 transition-all"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.19_162/20%)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {creating ? "Creating..." : "Create Automation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
