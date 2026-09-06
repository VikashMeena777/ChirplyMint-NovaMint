"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Plus,
  Trash2,
  Loader2,
  Crown,
  BarChart3,
  Send,
  MessageCircle,
  MousePointerClick,
  Sparkles,
  X,
  FlaskConical,
  ArrowUpRight,
  TrendingUp,
  LayoutTemplate,
  CheckCircle2,
} from "lucide-react";
import {
  getABVariants,
  createABVariant,
  deleteABVariant,
  declareABWinner,
  type ABVariant,
} from "@/lib/actions/ab-test";
import { toast } from "sonner";

interface ABTestPanelProps {
  automationId: string;
  userPlan: string;
}

interface TemplateButtonInput {
  title: string;
  url: string;
}

export default function ABTestPanel({ automationId, userPlan }: ABTestPanelProps) {
  const [variants, setVariants] = useState<ABVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [declaring, setDeclaring] = useState<string | null>(null);

  // Form State
  const [variantName, setVariantName] = useState("");
  const [templateType, setTemplateType] = useState<"text" | "button">("text");
  const [dmTemplate, setDmTemplate] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateSubtitle, setTemplateSubtitle] = useState("");
  const [templateImageUrl, setTemplateImageUrl] = useState("");
  const [buttons, setButtons] = useState<TemplateButtonInput[]>([
    { title: "Learn More", url: "https://" },
  ]);

  const isPro = userPlan === "pro" || userPlan === "business";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getABVariants(automationId);
      setVariants(data);
    } catch {
      toast.error("Failed to load A/B variants");
    } finally {
      setLoading(false);
    }
  }, [automationId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Plan Gate ───────────────────────────────────────
  if (!isPro) {
    return (
      <div className="p-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">A/B Testing (Pro Feature)</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Test up to 3 message variations simultaneously. Track reply rates, clicks, and automatically route leads to your highest-converting copy.
          </p>
        </div>
        <div className="pt-1">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white font-semibold shadow-md shadow-[oklch(0.52_0.19_162/20%)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Upgrade to Pro <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Add Button to Form ──────────────────────────────
  function handleAddButton() {
    if (buttons.length >= 3) {
      toast.error("Maximum 3 buttons allowed per template");
      return;
    }
    setButtons([...buttons, { title: "", url: "https://" }]);
  }

  function handleUpdateButton(index: number, field: keyof TemplateButtonInput, value: string) {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  }

  function handleRemoveButton(index: number) {
    setButtons(buttons.filter((_, i) => i !== index));
  }

  // ─── Create Variant ─────────────────────────────────
  async function handleCreate() {
    if (!variantName.trim()) {
      toast.error("Please enter a variant name");
      return;
    }

    if (templateType === "text" && !dmTemplate.trim()) {
      toast.error("Please enter the DM template text");
      return;
    }

    if (templateType === "button" && !templateTitle.trim()) {
      toast.error("Please enter the card title for the button template");
      return;
    }

    setCreating(true);
    try {
      const validButtons = buttons
        .filter((b) => b.title.trim() && b.url.trim())
        .map((b) => ({ type: "web_url", title: b.title.trim(), url: b.url.trim() }));

      const result = await createABVariant(automationId, {
        variant_name: variantName.trim(),
        dm_template: templateType === "text" ? dmTemplate.trim() : templateTitle.trim(),
        template_type: templateType,
        template_title: templateType === "button" ? templateTitle.trim() : undefined,
        template_subtitle: templateType === "button" && templateSubtitle.trim() ? templateSubtitle.trim() : undefined,
        template_image_url: templateType === "button" && templateImageUrl.trim() ? templateImageUrl.trim() : undefined,
        template_buttons: templateType === "button" ? validButtons : [],
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Variant "${variantName}" created!`);
        setVariantName("");
        setDmTemplate("");
        setTemplateTitle("");
        setTemplateSubtitle("");
        setTemplateImageUrl("");
        setButtons([{ title: "Learn More", url: "https://" }]);
        setShowAdd(false);
        await load();
      }
    } catch {
      toast.error("Failed to create variant");
    } finally {
      setCreating(false);
    }
  }

  // ─── Delete Variant ─────────────────────────────────
  async function handleDelete(id: string) {
    try {
      const result = await deleteABVariant(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setVariants((prev) => prev.filter((v) => v.id !== id));
        toast.success("Variant removed");
      }
    } catch {
      toast.error("Failed to delete variant");
    }
  }

  // ─── Declare Winner ─────────────────────────────────
  async function handleDeclareWinner(variantId: string) {
    setDeclaring(variantId);
    try {
      const result = await declareABWinner(automationId, variantId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("🏆 Winner declared! This template is now active for this automation.");
        await load();
      }
    } catch {
      toast.error("Failed to declare winner");
    } finally {
      setDeclaring(null);
    }
  }

  // ─── Stats Helpers ──────────────────────────────────
  function getReplyRate(v: ABVariant): number {
    if (v.sends === 0) return 0;
    return Math.round((v.replies / v.sends) * 100);
  }

  function getClickRate(v: ABVariant): number {
    if (v.sends === 0) return 0;
    return Math.round((v.link_clicks / v.sends) * 100);
  }

  const maxSends = Math.max(...variants.map((v) => v.sends), 1);
  const bestVariant = [...variants].sort((a, b) => getReplyRate(b) - getReplyRate(a))[0];

  // ─── Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="w-4 h-4 text-emerald-500" />
          <span>A/B Testing</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            {variants.length}/3 Variants
          </span>
        </div>
        {variants.length < 3 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 text-xs rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1.5 transition-colors"
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAdd ? "Cancel" : "Add Variant"}
          </button>
        )}
      </div>

      {/* Add Variant Form */}
      {showAdd && (
        <div className="p-4 rounded-xl border border-primary/20 bg-card/60 backdrop-blur-sm space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">New Variant</span>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setTemplateType("text")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  templateType === "text"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Text DM
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("button")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  templateType === "button"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Card / Button
              </button>
            </div>
          </div>

          <input
            type="text"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="Variant name (e.g. Direct CTA, Friendly & Casual)"
            maxLength={40}
            className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
          />

          {templateType === "text" ? (
            <div>
              <textarea
                value={dmTemplate}
                onChange={(e) => setDmTemplate(e.target.value)}
                placeholder="DM message copy... Use {name} for commenter handle"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Tip: Personalize with {"{name}"} or {"{keyword}"}. Keep under 300 characters for best reply rates.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <input
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Card title (e.g. Claim Your 20% Discount)"
                maxLength={80}
                className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={templateSubtitle}
                onChange={(e) => setTemplateSubtitle(e.target.value)}
                placeholder="Subtitle (optional)"
                maxLength={80}
                className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="url"
                value={templateImageUrl}
                onChange={(e) => setTemplateImageUrl(e.target.value)}
                placeholder="Header image URL (optional, https://...)"
                className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Action Buttons ({buttons.length}/3)</span>
                  {buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddButton}
                      className="text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Button
                    </button>
                  )}
                </div>
                {buttons.map((btn, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => handleUpdateButton(i, "title", e.target.value)}
                      placeholder="Button text"
                      maxLength={20}
                      className="w-1/3 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background"
                    />
                    <input
                      type="url"
                      value={btn.url}
                      onChange={(e) => handleUpdateButton(i, "url", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background"
                    />
                    {buttons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(i)}
                        className="p-1 text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {creating ? "Creating Variant..." : "Save & Activate Variant"}
          </button>
        </div>
      )}

      {/* Performance Comparison Overview (when multiple variants exist) */}
      {variants.length > 1 && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Comparative Performance
            </span>
            {bestVariant && bestVariant.sends > 0 && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                🏆 Top: {bestVariant.variant_name} ({getReplyRate(bestVariant)}% reply rate)
              </span>
            )}
          </div>
          <div className="space-y-2">
            {variants.map((v) => {
              const replyRate = getReplyRate(v);
              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-foreground truncate max-w-[160px]">
                      {v.variant_name}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {replyRate}% replies · {v.sends} sends
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        v.is_winner
                          ? "bg-amber-500"
                          : replyRate > 0
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/30"
                      }`}
                      style={{ width: `${Math.min(replyRate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Variant Cards */}
      {variants.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border bg-card/40">
          <BarChart3 className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">No message variations yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add a variant to test different copy hooks, discounts, or button templates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v) => {
            const replyRate = getReplyRate(v);
            const clickRate = getClickRate(v);
            const sendWidth = maxSends > 0 ? Math.max((v.sends / maxSends) * 100, 4) : 4;
            const isWinner = v.is_winner;
            const isLeader =
              variants.length > 1 &&
              bestVariant?.id === v.id &&
              v.sends > 0 &&
              !isWinner;

            return (
              <div
                key={v.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  isWinner
                    ? "border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-400/30"
                    : isLeader
                    ? "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                {/* Badges */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground">
                      {v.variant_name}
                    </span>
                    {isWinner && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center gap-1 shadow-xs">
                        <Crown className="w-3 h-3" /> ACTIVE WINNER
                      </span>
                    )}
                    {isLeader && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> LEADING
                      </span>
                    )}
                    {v.template_type === "button" && (
                      <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <LayoutTemplate className="w-2.5 h-2.5" /> Card
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!isWinner && variants.length >= 2 && (
                      <button
                        onClick={() => handleDeclareWinner(v.id)}
                        disabled={declaring !== null}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-950/30 flex items-center gap-1 transition-colors"
                        title="Declare this variant as winner and apply to automation"
                      >
                        {declaring === v.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trophy className="w-3 h-3" />
                        )}
                        <span>Pick Winner</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message preview */}
                <div className="p-2.5 rounded-lg bg-muted/50 text-xs text-foreground/90 font-mono mb-3">
                  {v.template_type === "button" && v.template_title ? (
                    <div>
                      <p className="font-bold text-[11px] text-foreground mb-0.5">
                        {v.template_title}
                      </p>
                      {v.template_subtitle && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {v.template_subtitle}
                        </p>
                      )}
                      <p className="text-[10px] text-primary">
                        {(v.template_buttons || []).length} button(s) configured
                      </p>
                    </div>
                  ) : (
                    <p className="line-clamp-2 text-[11px]">{v.dm_template}</p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border/60">
                  <div className="p-2 rounded-lg bg-background/80">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Send className="w-3 h-3 text-blue-500" /> Sends
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{v.sends}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/80">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <MessageCircle className="w-3 h-3 text-emerald-500" /> Reply Rate
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {replyRate}% <span className="text-[10px] text-muted-foreground font-normal">({v.replies})</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/80">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <MousePointerClick className="w-3 h-3 text-purple-500" /> Clicks
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {clickRate}% <span className="text-[10px] text-muted-foreground font-normal">({v.link_clicks})</span>
                    </p>
                  </div>
                </div>

                {/* Volume Progress Bar */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0">Traffic Share</span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${sendWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
