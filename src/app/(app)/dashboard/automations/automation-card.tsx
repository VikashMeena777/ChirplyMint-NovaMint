"use client";

import { useState } from "react";
import {
  Pause,
  Play,
  Pencil,
  Trash2,
  Users,
  Sparkles,
  ChevronRight,
  MessageSquareReply,
  Shield,
  LayoutTemplate,
  Tag,
  Send,
  GitBranch,
  FlaskConical,
  Workflow,
} from "lucide-react";
import DripSequenceBuilder from "@/components/dashboard/drip-sequence-builder";
import ABTestPanel from "@/components/dashboard/ab-test-panel";
import PostbackFlowPanel from "@/components/dashboard/postback-flow-panel";
import type { Automation } from "./automation-types";

/* ── Collapsible Drip Sequence Builder ── */
function DripToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full group py-1"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-90 text-primary" : ""}`}
        />
        <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
        <span>Drip Sequence</span>
        <span className="text-[10px] font-normal text-muted-foreground/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "2500px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3 pb-1">
          <DripSequenceBuilder automationId={automationId} userPlan={userPlan} />
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible A/B Test Panel ── */
function ABTestToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full group py-1"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-90 text-primary" : ""}`}
        />
        <FlaskConical className="w-3.5 h-3.5 text-emerald-500" />
        <span>A/B Testing</span>
        <span className="text-[10px] font-normal text-muted-foreground/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "2500px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3 pb-1">
          <ABTestPanel automationId={automationId} userPlan={userPlan} />
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible Postback Flow Panel ── */
function PostbackFlowToggle({ automationId, userPlan }: { automationId: string; userPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full group py-1"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-90 text-primary" : ""}`}
        />
        <Workflow className="w-3.5 h-3.5 text-blue-500" />
        <span>Postback Flows</span>
        <span className="text-[10px] font-normal text-muted-foreground/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "2500px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-3 pb-1">
          <PostbackFlowPanel automationId={automationId} userPlan={userPlan} />
        </div>
      </div>
    </div>
  );
}

/* ── Main AutomationCard component ── */
interface AutomationCardProps {
  automation: Automation;
  userPlan: string;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onEdit: (automation: Automation) => void;
}

export default function AutomationCard({
  automation: a,
  userPlan,
  onToggle,
  onDelete,
  onEdit,
}: AutomationCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden">
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
            onClick={() => onEdit(a)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Edit automation"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggle(a.id, a.status)}
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
            onClick={() => onDelete(a.id)}
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
  );
}
