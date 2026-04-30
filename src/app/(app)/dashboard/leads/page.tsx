"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Search, Download, Trash2, ChevronLeft, ChevronRight,
  Loader2, Webhook, ExternalLink, MessageCircle, Tag, StickyNote,
  Check, X, Filter, CheckSquare, Square,
} from "lucide-react";
import {
  getLeads, exportLeadsCSV, deleteLead, updateLeadTags,
  updateLeadNotes, bulkTagLeads, bulkDeleteLeads, getLeadTags,
} from "@/lib/actions/leads";
import { toast } from "sonner";
import Link from "next/link";

type Lead = Record<string, unknown>;

const PRESET_TAGS = [
  { label: "Hot", value: "hot", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { label: "Warm", value: "warm", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { label: "Cold", value: "cold", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { label: "Customer", value: "customer", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { label: "VIP", value: "vip", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
];

function getTagStyle(tag: string) {
  const preset = PRESET_TAGS.find((t) => t.value === tag);
  return preset?.color || "bg-muted text-muted-foreground border-border";
}

function getTagEmoji(tag: string) {
  const map: Record<string, string> = { hot: "🔥", warm: "🟡", cold: "🔵", customer: "✅", vip: "⭐" };
  return map[tag] || "🏷️";
}

// ─── Tag Picker Inline ───────────────────────────────────

function TagPicker({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const currentTags = (lead.tags as string[]) || [];

  async function toggleTag(tag: string) {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    const result = await updateLeadTags(lead.id as string, newTags);
    if (result.error) toast.error(result.error);
    else onUpdate();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
        title="Manage tags"
      >
        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-card border border-border shadow-xl p-2 space-y-1">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag.value}
                onClick={() => toggleTag(tag.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-muted/30 transition-colors"
              >
                {currentTags.includes(tag.value) ? (
                  <Check className="w-3.5 h-3.5 text-[oklch(0.52_0.19_162)]" />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
                <span>{getTagEmoji(tag.value)}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Inline Notes Editor ─────────────────────────────────

function NotesEditor({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((lead.custom_notes as string) || "");

  async function save() {
    const result = await updateLeadNotes(lead.id as string, value);
    if (result.error) toast.error(result.error);
    else { toast.success("Notes saved"); onUpdate(); }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="h-7 px-2 text-xs rounded-lg border border-border bg-background w-full focus:outline-none focus:ring-1 focus:ring-[oklch(0.52_0.19_162)]"
          placeholder="Add a note..."
        />
        <button onClick={save} className="p-1 rounded hover:bg-emerald-500/10"><Check className="w-3.5 h-3.5 text-emerald-400" /></button>
        <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-red-500/10"><X className="w-3.5 h-3.5 text-red-400" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
    >
      <StickyNote className="w-3 h-3 opacity-50 group-hover:opacity-100" />
      <span className="truncate max-w-[140px]">
        {(lead.custom_notes as string) || "Add note..."}
      </span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const limit = 10;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const result = await getLeads(page, limit, search, tagFilter);
    setLeads(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [page, search, tagFilter]);

  const loadTags = useCallback(async () => {
    const result = await getLeadTags();
    setAllTags(result.tags);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { loadTags(); }, [loadTags]);
  useEffect(() => { setPage(1); }, [search, tagFilter]);

  async function handleExport() {
    setExporting(true);
    const result = await exportLeadsCSV();
    if (result.error) {
      toast.error(result.error);
    } else if (result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chirplymint-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Leads exported successfully");
    }
    setExporting(false);
  }

  async function handleDelete(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => prev - 1);
    const result = await deleteLead(id);
    if (result.error) { toast.error(result.error); loadLeads(); }
    else toast.success("Lead removed");
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id as string)));
  }

  async function handleBulkTag(tag: string) {
    const ids = Array.from(selected);
    const result = await bulkTagLeads(ids, tag);
    if (result.error) toast.error(result.error);
    else { toast.success(`Tagged ${result.updated} leads as ${tag}`); loadLeads(); loadTags(); }
    setSelected(new Set());
    setBulkMenuOpen(false);
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    setLeads((prev) => prev.filter((l) => !selected.has(l.id as string)));
    setTotal((prev) => prev - ids.length);
    const result = await bulkDeleteLeads(ids);
    if (result.error) { toast.error(result.error); loadLeads(); }
    else toast.success(`Deleted ${ids.length} leads`);
    setSelected(new Set());
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} lead{total !== 1 ? "s" : ""} captured from your automations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/leads/export"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.19_162/20%)] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Webhook className="w-4 h-4" />
            Export Hub
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Quick CSV
          </button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by username or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{getTagEmoji(tag)} {tag}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[oklch(0.52_0.19_162/8%)] border border-[oklch(0.52_0.19_162/20%)]">
          <span className="text-sm font-medium text-[oklch(0.52_0.19_162)]">
            {selected.size} selected
          </span>
          <div className="relative">
            <button
              onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted/30 transition-colors"
            >
              <Tag className="w-3.5 h-3.5" /> Tag as...
            </button>
            {bulkMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBulkMenuOpen(false)} />
                <div className="absolute left-0 top-9 z-50 w-40 rounded-xl bg-card border border-border shadow-xl p-2 space-y-1">
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => handleBulkTag(tag.value)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-muted/30 transition-colors"
                    >
                      <span>{getTagEmoji(tag.value)}</span>
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted/50" />
                  <div className="h-3 w-48 rounded bg-muted/30" />
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-6 rounded-full bg-muted/40" />
                  <div className="w-8 h-8 rounded-lg bg-muted/30" />
                </div>
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {search || tagFilter ? "No leads match your filters" : "No leads yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || tagFilter
                ? "Try a different search or tag filter."
                : "Leads will appear here once your automations capture them from comments and DMs."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-12 gap-2 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1 flex items-center">
                <button onClick={toggleSelectAll} className="p-0.5">
                  {selected.size === leads.length ? (
                    <CheckSquare className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="col-span-2">Username</div>
              <div className="col-span-1">Source</div>
              <div className="col-span-2">Tags</div>
              <div className="col-span-2">Notes</div>
              <div className="col-span-2">Captured</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border">
              {leads.map((lead) => {
                const username = (lead.ig_username as string) || "unknown";
                const tags = (lead.tags as string[]) || [];
                const isSelected = selected.has(lead.id as string);

                return (
                  <div
                    key={lead.id as string}
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2 px-5 py-4 hover:bg-muted/20 transition-colors items-center ${
                      isSelected ? "bg-[oklch(0.52_0.19_162/5%)]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="hidden lg:flex col-span-1 items-center">
                      <button onClick={() => toggleSelect(lead.id as string)} className="p-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Username + Profile link */}
                    <div className="lg:col-span-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[oklch(0.52_0.19_162)]">
                          {username[0].toUpperCase()}
                        </span>
                      </div>
                      <a
                        href={`https://instagram.com/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-foreground hover:text-[oklch(0.52_0.19_162)] transition-colors flex items-center gap-1 group"
                      >
                        @{username}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>

                    {/* Source */}
                    <div className="lg:col-span-1">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]">
                        {(lead.source as string) || "—"}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="lg:col-span-2 flex items-center gap-1 flex-wrap">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTagStyle(tag)}`}
                        >
                          {getTagEmoji(tag)} {tag}
                        </span>
                      ))}
                      <TagPicker lead={lead} onUpdate={loadLeads} />
                    </div>

                    {/* Notes */}
                    <div className="lg:col-span-2">
                      <NotesEditor lead={lead} onUpdate={loadLeads} />
                    </div>

                    {/* Captured date */}
                    <div className="lg:col-span-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.captured_at as string).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1">
                      <a
                        href={`https://ig.me/m/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-xs font-medium hover:bg-[oklch(0.52_0.19_162/20%)] transition-colors"
                        title="Send DM on Instagram"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        DM
                      </a>
                      <a
                        href={`https://instagram.com/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                        title="View profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                      <button
                        onClick={() => handleDelete(lead.id as string)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
