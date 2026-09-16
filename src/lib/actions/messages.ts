"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceScope } from "@/lib/workspace";

export async function getMessages(
  page = 1,
  limit = 15,
  search = "",
  status = "all"
) {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { data: [], total: 0 };
  const { targetId, client: db } = scope;

  const offset = (page - 1) * limit;

  let query = db
    .from("dm_logs")
    .select("*", { count: "exact" })
    .eq("user_id", targetId)
    .order("sent_at", { ascending: false });

  if (search) {
    query = query.or(
      `recipient_username.ilike.%${search}%,message_text.ilike.%${search}%`
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count } = await query.range(offset, offset + limit - 1);

  return {
    data: (data as Record<string, unknown>[]) ?? [],
    total: count ?? 0,
  };
}

export async function getMessageStats() {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { total: 0, sent: 0, pending: 0, failed: 0 };
  const { targetId, client: db } = scope;

  const { count: total } = await db
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId);

  const { count: sent } = await db
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .eq("status", "sent");

  const { count: pending } = await db
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .eq("status", "pending");

  const { count: failed } = await db
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .eq("status", "failed");

  return {
    total: total ?? 0,
    sent: sent ?? 0,
    pending: pending ?? 0,
    failed: failed ?? 0,
  };
}
