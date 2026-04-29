"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

export async function getLeads(
  page = 1,
  limit = 10,
  search = "",
  tagFilter = ""
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], total: 0 };

  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false });

  if (search) {
    query = query.or(
      `ig_username.ilike.%${search}%,notes.ilike.%${search}%,custom_notes.ilike.%${search}%`
    );
  }

  if (tagFilter) {
    query = query.contains("tags", [tagFilter]);
  }

  const { data, count } = await query.range(offset, offset + limit - 1);

  return {
    data: (data as Record<string, unknown>[]) ?? [],
    total: count ?? 0,
  };
}

export async function exportLeadsCSV() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", csv: "" };

  const { data } = await supabase
    .from("leads")
    .select("ig_username, ig_user_id, source, notes, tags, custom_notes, captured_at")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false });

  if (!data || data.length === 0) {
    return { error: "No leads to export", csv: "" };
  }

  const headers = ["Username", "IG ID", "Source", "Notes", "Tags", "Custom Notes", "Captured At"];
  const rows = data.map((lead: Record<string, unknown>) =>
    [
      lead.ig_username,
      lead.ig_user_id,
      lead.source,
      lead.notes || "",
      Array.isArray(lead.tags) ? (lead.tags as string[]).join("; ") : "",
      lead.custom_notes || "",
      lead.captured_at,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  logActivity(user.id, "leads.exported", { count: data.length }).catch(
    () => {}
  );

  return { csv };
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "lead.deleted", { lead_id: id }).catch(() => {});

  return { success: true };
}

// ─── NEW: Update lead tags ──────────────────────────────

export async function updateLeadTags(leadId: string, tags: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .update({ tags })
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "lead.tags_updated", { lead_id: leadId, tags }).catch(
    () => {}
  );

  revalidatePath("/dashboard/leads");
  return { success: true };
}

// ─── NEW: Update lead custom notes ──────────────────────

export async function updateLeadNotes(leadId: string, customNotes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .update({ custom_notes: customNotes })
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "lead.notes_updated", { lead_id: leadId }).catch(
    () => {}
  );

  revalidatePath("/dashboard/leads");
  return { success: true };
}

// ─── NEW: Bulk tag leads ────────────────────────────────

export async function bulkTagLeads(leadIds: string[], tag: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let updated = 0;
  for (const id of leadIds) {
    // Fetch current tags
    const { data: lead } = await supabase
      .from("leads")
      .select("tags")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!lead) continue;

    const currentTags = (lead as Record<string, unknown>).tags as string[] || [];
    if (currentTags.includes(tag)) {
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("leads")
      .update({ tags: [...currentTags, tag] })
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) updated++;
  }

  logActivity(user.id, "leads.bulk_tagged", {
    count: updated,
    tag,
  }).catch(() => {});

  revalidatePath("/dashboard/leads");
  return { success: true, updated };
}

// ─── NEW: Bulk delete leads ─────────────────────────────

export async function bulkDeleteLeads(leadIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .delete()
    .in("id", leadIds)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "leads.bulk_deleted", { count: leadIds.length }).catch(
    () => {}
  );

  revalidatePath("/dashboard/leads");
  return { success: true };
}

// ─── NEW: Get unique tags for filter dropdown ───────────

export async function getLeadTags() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tags: [] };

  const { data } = await supabase
    .from("leads")
    .select("tags")
    .eq("user_id", user.id);

  if (!data) return { tags: [] };

  const allTags = new Set<string>();
  for (const row of data) {
    const tags = (row as Record<string, unknown>).tags as string[] | null;
    if (Array.isArray(tags)) {
      tags.forEach((t) => allTags.add(t));
    }
  }

  return { tags: Array.from(allTags).sort() };
}
