"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import {
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
} from "@/lib/actions/automations";
import { getInstagramPosts } from "@/lib/actions/instagram-api";
import { toast } from "sonner";

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

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  // Wizard state
  const [step, setStep] = useState(1);
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    keyword: "",
    dm_template: "",
    scope_type: "account" as "account" | "media",
    content_type: "all" as "all" | "reel" | "post",
    media_id: "",
    post_url: "",
    ai_enabled: false,
    ai_persona: "",
    comment_reply_enabled: false,
    comment_reply_template: "",
  });

  useEffect(() => {
    loadAutomations();
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
    const { data } = await getInstagramPosts();
    setPosts(data);
    setLoadingPosts(false);
  }, []);

  function openWizard() {
    setFormData({
      name: "",
      keyword: "",
      dm_template: "",
      scope_type: "account",
      content_type: "all",
      media_id: "",
      post_url: "",
      ai_enabled: false,
      ai_persona: "",
      comment_reply_enabled: false,
      comment_reply_template: "",
    });
    setStep(1);
    setShowCreate(true);
    loadPosts();
  }

  function canGoNext(): boolean {
    if (step === 1) {
      return (
        formData.name.trim().length > 0 &&
        formData.keyword.trim().length > 0 &&
        (formData.scope_type === "account" || formData.media_id.length > 0)
      );
    }
    if (step === 2) {
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
    fd.set("media_id", formData.media_id);
    fd.set("post_url", formData.post_url);
    fd.set("ai_enabled", formData.ai_enabled ? "true" : "false");
    fd.set("ai_persona", formData.ai_persona);
    fd.set(
      "comment_reply_enabled",
      formData.comment_reply_enabled ? "true" : "false"
    );
    fd.set("comment_reply_template", formData.comment_reply_template);

    const result = await createAutomation(fd);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Automation created successfully! 🚀");
      setShowCreate(false);
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
              className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {a.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === "active"
                          ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                          : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {a.status === "active" ? "Active" : "Paused"}
                    </span>
                    {a.ai_enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    )}
                    {a.comment_reply_enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <MessageSquareReply className="w-3 h-3" />
                        Reply
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Keywords:{" "}
                      {(a.keyword || "").split(",").map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded text-xs mr-1"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {a.scope_type === "media" ? "📌 Specific post" : "🌐 All posts"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5" title="DMs sent">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{a.dms_sent}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Leads captured">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{a.leads_captured}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(a.id, a.status)}
                    className={`p-2 rounded-lg border transition-colors ${
                      a.status === "active"
                        ? "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                    }`}
                    title={a.status === "active" ? "Pause" : "Resume"}
                  >
                    {a.status === "active" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                      placeholder="e.g. FREE, GUIDE, LINK"
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated. Anyone commenting these words will
                      receive a DM.
                    </p>
                  </div>

                  {/* Scope: All Posts vs Specific Post */}
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

                  {/* Content Type Filter (for account scope) */}
                  {formData.scope_type === "account" && (
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

                  {/* Post Picker Grid */}
                  {formData.scope_type === "media" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Select a Post
                      </label>
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
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto rounded-xl border border-border p-2 bg-background">
                          {posts.map((post) => (
                            <button
                              type="button"
                              key={post.id}
                              onClick={() =>
                                setFormData((f) => ({
                                  ...f,
                                  media_id: post.id,
                                  post_url: post.permalink,
                                }))
                              }
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                formData.media_id === post.id
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
                              {formData.media_id === post.id && (
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 2: RESPONSE CONFIG ─── */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* DM Template */}
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
                            DM Message
                          </p>
                          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                            {formData.dm_template || "No template set"}
                          </p>
                          {formData.ai_enabled && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
                              <Sparkles className="w-3 h-3" />
                              AI will personalize this
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comment Reply */}
                      {formData.comment_reply_enabled && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <MessageSquareReply className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Comment Reply
                            </p>
                            <p className="text-sm text-foreground mt-0.5">
                              {formData.comment_reply_template || "No reply set"}
                            </p>
                          </div>
                        </div>
                      )}
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
