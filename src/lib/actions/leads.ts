"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";

export async function getLeads(page = 1, limit = 10, search = "") {
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
      `ig_username.ilike.%${search}%,notes.ilike.%${search}%`
    );
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
    .select("ig_username, ig_user_id, source, notes, captured_at")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false });

  if (!data || data.length === 0) {
    return { error: "No leads to export", csv: "" };
  }

  const headers = ["Username", "IG ID", "Source", "Notes", "Captured At"];
  const rows = data.map((lead: Record<string, unknown>) =>
    [
      lead.ig_username,
      lead.ig_user_id,
      lead.source,
      lead.notes || "",
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
