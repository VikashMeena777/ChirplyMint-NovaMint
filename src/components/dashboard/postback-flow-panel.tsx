"use client";

import { useState, useEffect, useCallback } from "react";
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
  ExternalLink,
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
    setLoading(false);
    setHasChanges(false);
  }, [automationId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Plan Gate ───────────────────────────────────────
  if (!isPro) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-center">
        <Workflow className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Postback Flow Builder</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upgrade to Pro to build interactive DM funnels with button-click responses.
        </p>
        <button className="mt-3 px-4 py-1.5 text-xs rounded-lg bg-gradient-mint text-white font-semibold hover:opacity-90 transition-opacity">
          Upgrade to Pro
        </button>
      </div>
    );
  }

  // ─── Handlers ───────────────────────────────────────
  function addFlow() {
    setFlows((prev) => [...prev, emptyFlow()]);
    setHasChanges(true);
  }

  function removeFlow(index: number) {
    setFlows((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }

  function updateFlow(index: number, field: string, value: string) {
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
      buttons.push({ type: "web_url", title: "", url: "" });
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
      toast.success(`${flows.length} flow(s) saved!`);
      setHasChanges(false);
    }
    setSaving(false);
  }

  async function handleClearAll() {
    setSaving(true);
    const result = await deletePostbackFlows(automationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setFlows([]);
      setHasChanges(false);
      toast.success("All flows cleared");
    }
    setSaving(false);
  }

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
          <Workflow className="w-4 h-4 text-primary" />
          Postback Flows ({flows.length})
        </div>
        <div className="flex items-center gap-2">
          {flows.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={saving}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-800 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={addFlow}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Flow
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Define what happens when a user taps a button in your DM. Each flow responds to a specific button payload.
      </p>

      {/* Flow Cards */}
      {flows.length === 0 ? (
        <div className="text-center py-6">
          <Workflow className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No postback flows defined</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add flows to create interactive button-response funnels
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flows.map((flow, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border bg-card space-y-3"
            >
              {/* Flow header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Flow {idx + 1}
                </span>
                <button
                  onClick={() => removeFlow(idx)}
                  className="p-1 rounded-lg text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  title="Remove flow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Payload + Label */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Payload ID</label>
                  <input
                    value={flow.payload}
                    onChange={(e) => updateFlow(idx, "payload", e.target.value.replace(/\s/g, "_").toLowerCase())}
                    placeholder="e.g. get_link"
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Button Label</label>
                  <input
                    value={flow.label}
                    onChange={(e) => updateFlow(idx, "label", e.target.value)}
                    placeholder="e.g. Get the Link"
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Response Type */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Response Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFlow(idx, "response_type", "text")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      flow.response_type === "text"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Text Reply
                  </button>
                  <button
                    onClick={() => updateFlow(idx, "response_type", "button")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      flow.response_type === "button"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" /> Button Template
                  </button>
                </div>
              </div>

              {/* Text response */}
              {flow.response_type === "text" && (
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Response Text</label>
                  <textarea
                    value={flow.response_text}
                    onChange={(e) => updateFlow(idx, "response_text", e.target.value)}
                    placeholder="The message sent when user taps this button..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              )}

              {/* Button template response */}
              {flow.response_type === "button" && (
                <div className="space-y-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Title</label>
                    <input
                      value={flow.response_template_title}
                      onChange={(e) => updateFlow(idx, "response_template_title", e.target.value)}
                      placeholder="Template title"
                      maxLength={80}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Subtitle</label>
                    <input
                      value={flow.response_template_subtitle}
                      onChange={(e) => updateFlow(idx, "response_template_subtitle", e.target.value)}
                      placeholder="Optional subtitle"
                      maxLength={80}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Image URL</label>
                    <input
                      value={flow.response_template_image_url}
                      onChange={(e) => updateFlow(idx, "response_template_image_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {/* Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-muted-foreground">Buttons ({flow.response_template_buttons.length}/3)</label>
                      {flow.response_template_buttons.length < 3 && (
                        <button
                          onClick={() => addButton(idx)}
                          className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                    {flow.response_template_buttons.map((btn, bi) => (
                      <div key={bi} className="flex gap-2 mb-2 items-center">
                        <input
                          value={btn.title}
                          onChange={(e) => updateButton(idx, bi, "title", e.target.value)}
                          placeholder="Button label"
                          maxLength={30}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={btn.url || ""}
                          onChange={(e) => updateButton(idx, bi, "url", e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          onClick={() => removeButton(idx, bi)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Tag */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1 block">
                  <Tag className="w-3 h-3" /> Lead Tag (optional)
                </label>
                <input
                  value={flow.lead_tag}
                  onChange={(e) => updateFlow(idx, "lead_tag", e.target.value)}
                  placeholder="e.g. interested, clicked_cta"
                  maxLength={40}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          ))}

          {/* Save button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : `Save ${flows.length} Flow(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
