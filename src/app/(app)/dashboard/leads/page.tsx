"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { getLeads, exportLeadsCSV, deleteLead } from "@/lib/actions/leads";
import { toast } from "sonner";

type Lead = Record<string, unknown>;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const limit = 10;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const result = await getLeads(page, limit, search);
    setLeads(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search]);

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
    if (result.error) {
      toast.error(result.error);
      loadLeads(); // Reload on error
    } else {
      toast.success("Lead removed");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} lead{total !== 1 ? "s" : ""} captured from your automations.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by username or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {search ? "No leads match your search" : "No leads yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {search
                ? "Try a different search term."
                : "Leads will appear here once your automations capture them from comments and DMs."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Username</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-3">Notes</div>
              <div className="col-span-3">Captured</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-border">
              {leads.map((lead) => (
                <div
                  key={lead.id as string}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 hover:bg-muted/20 transition-colors items-center"
                >
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[oklch(0.52_0.19_162)]">
                        {((lead.ig_username as string) || "U")[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      @{(lead.ig_username as string) || "unknown"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]">
                      {(lead.source as string) || "—"}
                    </span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-sm text-muted-foreground">
                      {(lead.notes as string) || "—"}
                    </span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(
                        lead.captured_at as string
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(lead.id as string)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
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
