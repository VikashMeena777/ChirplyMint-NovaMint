"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Workflow,
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  Tag,
  MessageCircle,
  LayoutTemplate,
  Sparkles,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import {
  getPostbackFlows,
  savePostbackFlows,
  deletePostbackFlows,
  type PostbackFlow,
} from "@/lib/actions/postback-flows";
import { toast } from "sonner";

interface PostbackFlowPanelProps {
  automationId: string;
  userPlan: string;
}

interface FlowDraft {
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

function emptyFlow(): FlowDraft {
  return {
    payload: "",
    label: "",
    response_type: "text",
    response_text: "",
    response_template_title: "",
    response_template_subtitle: "",
    response_template_image_url: "",
    response_template_buttons: [],
    lead_tag: "",
  };
}

export default function PostbackFlowPanel({ automationId, userPlan }: PostbackFlowPanelProps) {
  const [flows, setFlows] = useState<FlowDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const isPro = userPlan === "pro" || userPlan === "business";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPostbackFlows(automationId);
      setFlows(
        data.map((f: PostbackFlow) => ({
          payload: f.payload,
          label: f.label,
          response_type: f.response_type,
          response_text: f.response_text || "",
          response_template_title: f.response_template_title || "",
          response_template_subtitle: f.response_template_subtitle || "",
          response_template_image_url: f.response_template_image_url || "",
          response_template_buttons: f.response_template_buttons || [],
          lead_tag: f.lead_tag || "",
        }))
      );
    } catch {
      toast.error("Failed to load postback flows");
    } finally {
      setLoading(false);
      setHasChanges(false);
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
          <Workflow className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Postback Flow Builder (Pro Feature)</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Build interactive branching DM funnels. When users tap buttons in your message, trigger instant targeted replies and auto-tag leads.
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

  // ─── Handlers ───────────────────────────────────────
  function addFlow() {
    setFlows((prev) => [...prev, emptyFlow()]);
    setHasChanges(true);
  }

  function addPresetFlow(type: "freebie" | "pricing" | "call") {
    let preset: FlowDraft;
    if (type === "freebie") {
      preset = {
        payload: "get_freebie",
        label: "🎁 Get Free Resource",
        response_type: "text",
        response_text: "Here is your free guide! 🎉 Tap here to download: https://chirplymint.com/freebie",
        response_template_title: "",
        response_template_subtitle: "",
        response_template_image_url: "",
        response_template_buttons: [],
        lead_tag: "freebie_downloaded",
      };
    } else if (type === "pricing") {
      preset = {
        payload: "view_pricing",
        label: "💳 View Plans & Pricing",
        response_type: "button",
        response_text: "",
        response_template_title: "ChirplyMint Plans & Special Offers",
        response_template_subtitle: "Choose the plan that best fits your workflow",
        response_template_image_url: "",
        response_template_buttons: [
          { type: "web_url", title: "View Plans", url: "https://chirplymint.com/pricing" },
        ],
        lead_tag: "pricing_interest",
      };
    } else {
      preset = {
        payload: "book_strategy_call",
        label: "📅 Book 1-on-1 Call",
        response_type: "text",
        response_text: "Let's chat! Pick a 15-minute slot on my calendar: https://cal.com/example",
        response_template_title: "",
        response_template_subtitle: "",
        response_template_image_url: "",
        response_template_buttons: [],
        lead_tag: "call_booked",
      };
    }

    setFlows((prev) => [...prev, preset]);
    setHasChanges(true);
    toast.success(`Added "${preset.label}" flow preset`);
  }

  function removeFlow(index: number) {
    setFlows((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }

  function updateFlow(index: number, field: keyof FlowDraft, value: unknown) {
    setFlows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  }

  function addButton(index: number) {
    setFlows((prev) => {
      const updated = [...prev];
      const buttons = [...updated[index].response_template_buttons];
      if (buttons.length >= 3) {
        toast.error("Maximum 3 buttons per flow");
        return prev;
      }
      buttons.push({ type: "web_url", title: "", url: "https://" });
      updated[index] = { ...updated[index], response_template_buttons: buttons };
      return updated;
    });
    setHasChanges(true);
  }

  function updateButton(flowIndex: number, btnIndex: number, field: "title" | "url", value: string) {
    setFlows((prev) => {
      const updated = [...prev];
      const buttons = [...updated[flowIndex].response_template_buttons];
      buttons[btnIndex] = { ...buttons[btnIndex], [field]: value };
      updated[flowIndex] = { ...updated[flowIndex], response_template_buttons: buttons };
      return updated;
    });
    setHasChanges(true);
  }

  function removeButton(flowIndex: number, btnIndex: number) {
    setFlows((prev) => {
      const updated = [...prev];
      const buttons = updated[flowIndex].response_template_buttons.filter((_, i) => i !== btnIndex);
      updated[flowIndex] = { ...updated[flowIndex], response_template_buttons: buttons };
      return updated;
    });
    setHasChanges(true);
  }

  async function handleSave() {
    // Validate
    for (const flow of flows) {
      if (!flow.payload.trim() || !flow.label.trim()) {
        toast.error("Each flow needs a payload ID and label");
        return;
      }
      if (flow.response_type === "text" && !flow.response_text.trim()) {
        toast.error(`Flow "${flow.label}" needs response text`);
        return;
      }
      if (flow.response_type === "button" && !flow.response_template_title.trim()) {
        toast.error(`Flow "${flow.label}" needs a template title`);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await savePostbackFlows(
        automationId,
        flows.map((f) => ({
          payload: f.payload,
          label: f.label,
          response_type: f.response_type,
          response_text: f.response_text || null,
          response_template_title: f.response_template_title || null,
          response_template_subtitle: f.response_template_subtitle || null,
          response_template_image_url: f.response_template_image_url || null,
          response_template_buttons: f.response_template_buttons,
          lead_tag: f.lead_tag || null,
        }))
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${flows.length} postback flow(s) saved!`);
        setHasChanges(false);
      }
    } catch {
      toast.error("Failed to save postback flows");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAll() {
    if (!confirm("Are you sure you want to delete all postback flows for this automation?")) {
      return;
    }

    setSaving(true);
    try {
      const result = await deletePostbackFlows(automationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setFlows([]);
        setHasChanges(false);
        toast.success("All flows cleared");
      }
    } catch {
      toast.error("Failed to clear flows");
    } finally {
      setSaving(false);
    }
  }

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
          <Workflow className="w-4 h-4 text-blue-500" />
          <span>Postback Flows</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-mono font-medium">
            {flows.length} Flow{flows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {flows.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={saving}
              className="px-2.5 py-1 text-xs rounded-lg border border-red-200 dark:border-red-900/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={addFlow}
            className="px-3 py-1.5 text-xs rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Flow
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        When a user taps an interactive button in your Instagram DM, ChirplyMint responds with the matching flow below.
      </p>

      {/* Preset Quick Starters */}
      {flows.length === 0 && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Quick-Start Funnel Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addPresetFlow("freebie")}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background hover:border-primary/50 text-foreground transition-colors"
            >
              🎁 Lead Magnet Funnel
            </button>
            <button
              type="button"
              onClick={() => addPresetFlow("pricing")}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background hover:border-primary/50 text-foreground transition-colors"
            >
              💳 Pricing Menu
            </button>
            <button
              type="button"
              onClick={() => addPresetFlow("call")}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background hover:border-primary/50 text-foreground transition-colors"
            >
              📅 1:1 Calendar Booking
            </button>
          </div>
        </div>
      )}

      {/* Flow Cards */}
      {flows.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border bg-card/40">
          <Workflow className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">No postback flows configured</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click &quot;Add Flow&quot; or pick a preset above to create an automated button-response funnel.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {flows.map((flow, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs"
            >
              {/* Flow Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Flow {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                    {flow.label || "Untitled Button"}
                  </span>
                </div>
                <button
                  onClick={() => removeFlow(idx)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  title="Remove flow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Payload + Label */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Payload ID (unique key)
                  </label>
                  <input
                    value={flow.payload}
                    onChange={(e) =>
                      updateFlow(idx, "payload", e.target.value.replace(/\s/g, "_").toLowerCase())
                    }
                    placeholder="e.g. download_link"
                    maxLength={50}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Trigger Button Label
                  </label>
                  <input
                    value={flow.label}
                    onChange={(e) => updateFlow(idx, "label", e.target.value)}
                    placeholder="e.g. Download Freebie"
                    maxLength={50}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Response Type Toggle */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">
                  Reply Format
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateFlow(idx, "response_type", "text")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      flow.response_type === "text"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Text Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFlow(idx, "response_type", "button")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      flow.response_type === "button"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" /> Button Card
                  </button>
                </div>
              </div>

              {/* Text Response */}
              {flow.response_type === "text" && (
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Response Text
                  </label>
                  <textarea
                    value={flow.response_text}
                    onChange={(e) => updateFlow(idx, "response_text", e.target.value)}
                    placeholder="Message sent when user taps this button..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              )}

              {/* Button Template Response */}
              {flow.response_type === "button" && (
                <div className="space-y-2.5 p-3 rounded-xl border border-dashed border-border bg-muted/20">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Card Title</label>
                    <input
                      value={flow.response_template_title}
                      onChange={(e) => updateFlow(idx, "response_template_title", e.target.value)}
                      placeholder="Card heading"
                      maxLength={80}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Card Subtitle</label>
                    <input
                      value={flow.response_template_subtitle}
                      onChange={(e) => updateFlow(idx, "response_template_subtitle", e.target.value)}
                      placeholder="Optional subtitle"
                      maxLength={80}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Image URL</label>
                    <input
                      value={flow.response_template_image_url}
                      onChange={(e) => updateFlow(idx, "response_template_image_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background"
                    />
                  </div>
                  {/* Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-[11px] text-muted-foreground">
                      <span>Card Buttons ({flow.response_template_buttons.length}/3)</span>
                      {flow.response_template_buttons.length < 3 && (
                        <button
                          type="button"
                          onClick={() => addButton(idx)}
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add Link
                        </button>
                      )}
                    </div>
                    {flow.response_template_buttons.map((btn, bi) => (
                      <div key={bi} className="flex gap-2 mb-2 items-center">
                        <input
                          value={btn.title}
                          onChange={(e) => updateButton(idx, bi, "title", e.target.value)}
                          placeholder="Button text"
                          maxLength={30}
                          className="w-1/3 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background"
                        />
                        <input
                          value={btn.url || ""}
                          onChange={(e) => updateButton(idx, bi, "url", e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => removeButton(idx, bi)}
                          className="p-1 text-muted-foreground hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Tag */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-500" /> Apply Lead Tag on Click (Optional)
                </label>
                <input
                  value={flow.lead_tag}
                  onChange={(e) => updateFlow(idx, "lead_tag", e.target.value)}
                  placeholder="e.g. clicked_catalog, vip_interest"
                  maxLength={40}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          ))}

          {/* Save Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving Changes..." : `Save ${flows.length} Flow(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
