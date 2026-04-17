"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMessages(
  page = 1,
  limit = 15,
  search = "",
  status = "all"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], total: 0 };

  const offset = (page - 1) * limit;

  let query = supabase
    .from("dm_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, sent: 0, pending: 0, failed: 0 };

  const { count: total } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: sent } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent");

  const { count: pending } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { count: failed } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "failed");

  return {
    total: total ?? 0,
    sent: sent ?? 0,
    pending: pending ?? 0,
    failed: failed ?? 0,
  };
}
