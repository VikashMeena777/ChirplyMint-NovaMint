"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function ABTestPanel({ automationId, userPlan }: ABTestPanelProps) {
  const [variants, setVariants] = useState<ABVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [declaring, setDeclaring] = useState<string | null>(null);

  // Form
  const [variantName, setVariantName] = useState("");
  const [variantTemplate, setVariantTemplate] = useState("");

  const isPro = userPlan === "pro" || userPlan === "business";

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getABVariants(automationId);
    setVariants(data);
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Plan Gate ───────────────────────────────────────
  if (!isPro) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-center">
        <FlaskConical className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">A/B Testing</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upgrade to Pro to test multiple message variants and optimize your reply rates.
        </p>
        <button className="mt-3 px-4 py-1.5 text-xs rounded-lg bg-gradient-mint text-white font-semibold hover:opacity-90 transition-opacity">
          Upgrade to Pro
        </button>
      </div>
    );
  }

  // ─── Create Variant ─────────────────────────────────
  async function handleCreate() {
    if (!variantName.trim() || !variantTemplate.trim()) {
      toast.error("Please enter a variant name and DM template");
      return;
    }
    setCreating(true);
    const result = await createABVariant(automationId, {
      variant_name: variantName.trim(),
      dm_template: variantTemplate.trim(),
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Variant "${variantName}" created!`);
      setVariantName("");
      setVariantTemplate("");
      setShowAdd(false);
      await load();
    }
    setCreating(false);
  }

  // ─── Delete Variant ─────────────────────────────────
  async function handleDelete(id: string) {
    const result = await deleteABVariant(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setVariants((prev) => prev.filter((v) => v.id !== id));
      toast.success("Variant deleted");
    }
  }

  // ─── Declare Winner ─────────────────────────────────
  async function handleDeclareWinner(variantId: string) {
    setDeclaring(variantId);
    const result = await declareABWinner(automationId, variantId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("🏆 Winner declared! Template applied to automation.");
      await load();
    }
    setDeclaring(null);
  }

  // ─── Stats helper ───────────────────────────────────
  function getReplyRate(v: ABVariant): number {
    if (v.sends === 0) return 0;
    return Math.round((v.replies / v.sends) * 100);
  }

  const maxSends = Math.max(...variants.map((v) => v.sends), 1);

  // ─── Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FlaskConical className="w-4 h-4 text-primary" />
          A/B Variants ({variants.length}/3)
        </div>
        {variants.length < 3 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1 transition-colors"
          >
            {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAdd ? "Cancel" : "Add Variant"}
          </button>
        )}
      </div>

      {/* Add Variant Form */}
      {showAdd && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <input
            type="text"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="Variant name (e.g., Casual Tone)"
            maxLength={40}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={variantTemplate}
            onChange={(e) => setVariantTemplate(e.target.value)}
            placeholder="DM template text... Use {name} for personalization"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !variantName.trim() || !variantTemplate.trim()}
            className="w-full py-2.5 rounded-lg bg-gradient-mint text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {creating ? "Creating..." : "Create Variant"}
          </button>
        </div>
      )}

      {/* Variant Cards */}
      {variants.length === 0 ? (
        <div className="text-center py-6">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No A/B variants yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Create variants to test different message templates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v) => {
            const replyRate = getReplyRate(v);
            const sendWidth = maxSends > 0 ? Math.max((v.sends / maxSends) * 100, 4) : 4;
            const isWinner = v.is_winner;

            return (
              <div
                key={v.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  isWinner
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-200 dark:ring-amber-800"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Winner badge */}
                {isWinner && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[10px] font-bold text-black flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3" /> WINNER
                  </div>
                )}

                {/* Variant header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {v.variant_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {v.dm_template}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {!isWinner && variants.length >= 2 && (
                      <button
                        onClick={() => handleDeclareWinner(v.id)}
                        disabled={declaring !== null}
                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                        title="Declare as winner"
                      >
                        {declaring === v.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trophy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                      <Send className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sends</p>
                      <p className="text-sm font-bold text-foreground">{v.sends}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Replies</p>
                      <p className="text-sm font-bold text-foreground">{v.replies}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                      <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="text-sm font-bold text-foreground">{v.link_clicks}</p>
                    </div>
                  </div>
                </div>

                {/* Reply Rate Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Reply Rate</span>
                    <span
                      className={`text-xs font-bold ${
                        replyRate >= 30
                          ? "text-green-500"
                          : replyRate >= 15
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {replyRate}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        replyRate >= 30
                          ? "bg-gradient-to-r from-green-400 to-emerald-500"
                          : replyRate >= 15
                          ? "bg-gradient-to-r from-amber-400 to-orange-500"
                          : "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500"
                      }`}
                      style={{ width: `${Math.min(replyRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Send Volume Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Send Volume</span>
                    <span className="text-[11px] text-muted-foreground">{v.sends} sends</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
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
