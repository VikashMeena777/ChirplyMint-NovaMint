"use client";

import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import {
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
} from "@/lib/actions/automations";
import { toast } from "sonner";

interface Automation {
  id: string;
  name: string;
  keyword: string;
  dm_template: string;
  post_url: string | null;
  status: string;
  dms_sent: number;
  leads_captured: number;
  created_at: string;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

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

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const result = await createAutomation(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Automation created!");
      setShowCreate(false);
      loadAutomations();
    }
    setCreating(false);
  }

  async function handleToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const result = await toggleAutomation(id, newStatus as "active" | "paused");
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
            Manage your keyword-triggered DM automations.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
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
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-border p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
            <Bot className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No automations yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create your first automation to start sending DMs when someone
            comments a keyword on your post.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-white border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {a.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === "active"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {a.status === "active" ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keyword:{" "}
                    <span className="font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded text-xs">
                      {a.keyword}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>{a.dms_sent}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{a.leads_captured}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(a.id, a.status)}
                    className={`p-2 rounded-lg border transition-colors ${
                      a.status === "active"
                        ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                        : "border-green-200 text-green-600 hover:bg-green-50"
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
                    className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5 relative">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                Create Automation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set up a keyword trigger to auto-DM commenters.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Automation Name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Free Guide Giveaway"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Trigger Keyword
                </label>
                <input
                  name="keyword"
                  required
                  placeholder="e.g. FREE, GUIDE, LINK"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground">
                  When someone comments this keyword, they&apos;ll receive a DM.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  DM Message Template
                </label>
                <textarea
                  name="dm_template"
                  required
                  rows={3}
                  placeholder="Hey {name}! 👋 Here's your free guide..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{name}"} to personalize. Supports links and emojis.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Post URL{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  name="post_url"
                  placeholder="https://instagram.com/p/..."
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Automation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
