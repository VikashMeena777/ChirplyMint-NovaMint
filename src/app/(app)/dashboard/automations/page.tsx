"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bot,
  Plus,
  Search,
} from "lucide-react";
import {
  getAutomations,
  toggleAutomation,
  deleteAutomation,
} from "@/lib/actions/automations";
import { toast } from "sonner";
import { AutomationCardSkeleton } from "@/components/ui/page-skeleton";
import { getProfile } from "@/lib/actions/dashboard";
import { type PlanKey } from "@/lib/utils/plan-limits";
import type { Automation } from "./automation-types";
import AutomationCard from "./automation-card";
import CreateAutomationWizard from "./create-automation-wizard";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [search, setSearch] = useState("");
  const [userPlan, setUserPlan] = useState<PlanKey>("free");

  // Multi-account state
  const [igAccounts, setIgAccounts] = useState<
    { id: string; ig_username: string; ig_profile_pic: string | null }[]
  >([]);

  useEffect(() => {
    loadAutomations();
    // Load user plan for feature gating
    getProfile().then((profile) => {
      if (profile) {
        const plan = (profile.plan || "free") as PlanKey;
        setUserPlan(plan);
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
      });
    });
  }, []);

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    const { data } = await getAutomations();
    setAutomations((data as Automation[]) ?? []);
    setLoading(false);
  }, []);

  const filtered = automations.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.keyword.toLowerCase().includes(search.toLowerCase())
  );

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
          onClick={() => setShowCreate(true)}
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
              onClick={() => setShowCreate(true)}
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
            <AutomationCard
              key={a.id}
              automation={a}
              userPlan={userPlan}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={(automation) => setEditing(automation)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Automation Wizard Modal */}
      {(showCreate || editing) && (
        <CreateAutomationWizard
          key={editing ? `edit-${editing.id}` : "create"}
          userPlan={userPlan}
          igAccounts={igAccounts}
          editAutomation={editing}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onCreated={loadAutomations}
        />
      )}
    </div>
  );
}
