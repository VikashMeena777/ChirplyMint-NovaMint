"use client";

import { useState } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  Trophy,
  MessageCircle,
  Send,
  Reply,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createABVariant,
  deleteABVariant,
  declareABWinner,
  type ABVariant,
} from "@/lib/actions/ab-test";

interface ABTestPanelProps {
  automationId: string;
  variants: ABVariant[];
  onUpdate: () => void;
}

export function ABTestPanel({
  automationId,
  variants: initialVariants,
  onUpdate,
}: ABTestPanelProps) {
  const [variants, setVariants] = useState<ABVariant[]>(initialVariants);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newVariant, setNewVariant] = useState({
    variant_name: "",
    dm_template: "",
  });

  const handleCreate = async () => {
    if (!newVariant.variant_name.trim() || !newVariant.dm_template.trim()) {
      toast.error("Fill in both variant name and message template");
      return;
    }

    setLoading(true);
    const result = await createABVariant(automationId, newVariant);
    setLoading(false);

    if (result.success) {
      toast.success("Variant created!");
      setNewVariant({ variant_name: "", dm_template: "" });
      setShowForm(false);
      onUpdate();
    } else {
      toast.error(result.error || "Failed to create variant");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteABVariant(id);
    if (result.success) {
      setVariants((v) => v.filter((x) => x.id !== id));
      toast.success("Variant deleted");
      onUpdate();
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  const handleDeclareWinner = async (variantId: string) => {
    setLoading(true);
    const result = await declareABWinner(automationId, variantId);
    setLoading(false);
    if (result.success) {
      toast.success(
        "Winner declared! Template has been applied to the automation."
      );
      onUpdate();
    } else {
      toast.error(result.error || "Failed to declare winner");
    }
  };

  const totalSends = variants.reduce((sum, v) => sum + v.sends, 0);

  return (
    <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-violet-200 dark:border-violet-800">
        <FlaskConical className="w-4 h-4 text-violet-500" />
        <h4 className="text-sm font-semibold text-foreground">A/B Testing</h4>
        <span className="ml-auto text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40 px-2 py-0.5 rounded-full">
          {variants.length} variant{variants.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Test different message templates to find what converts best. Traffic
          is split evenly between active variants.
        </p>

        {/* Existing Variants */}
        {variants.length > 0 && (
          <div className="space-y-2">
            {variants.map((v) => {
              const sendPct =
                totalSends > 0
                  ? Math.round((v.sends / totalSends) * 100)
                  : 0;
              const replyRate =
                v.sends > 0 ? ((v.replies / v.sends) * 100).toFixed(1) : "0";

              return (
                <div
                  key={v.id}
                  className={`rounded-lg border p-3 transition-all ${
                    v.is_winner
                      ? "border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                      : v.status === "completed"
                        ? "border-border bg-muted/30 opacity-60"
                        : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {v.is_winner && (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {v.variant_name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          v.status === "running"
                            ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                            : v.status === "winner"
                              ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.status === "running" && !v.is_winner && (
                        <button
                          onClick={() => handleDeclareWinner(v.id)}
                          disabled={loading}
                          className="text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
                          title="Declare winner"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Template preview */}
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    <MessageCircle className="w-3 h-3 inline mr-1" />
                    {v.dm_template}
                  </p>

                  {/* Stats bar */}
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Send className="w-3 h-3" />
                      {v.sends} sends ({sendPct}%)
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Reply className="w-3 h-3" />
                      {replyRate}% reply
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Link2 className="w-3 h-3" />
                      {v.link_clicks} clicks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Variant Form */}
        {showForm ? (
          <div className="rounded-lg border border-dashed border-violet-300 dark:border-violet-700 p-3 space-y-2">
            <input
              value={newVariant.variant_name}
              onChange={(e) =>
                setNewVariant((v) => ({ ...v, variant_name: e.target.value }))
              }
              placeholder="Variant name (e.g. Variant B)"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <textarea
              value={newVariant.dm_template}
              onChange={(e) =>
                setNewVariant((v) => ({ ...v, dm_template: e.target.value }))
              }
              placeholder="DM template text..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Create Variant
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            disabled={variants.length >= 3}
            className="w-full h-9 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Variant {variants.length >= 3 && "(max 3)"}
          </button>
        )}
      </div>
    </div>
  );
}
