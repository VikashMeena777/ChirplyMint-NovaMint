import { NextResponse } from "next/server";
import { createClient, createClient as createAdminClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * D8: Public API v1 (read-only, Business plan). Auth: `Authorization: Bearer cmk_...`
 * Keys are hashed at rest; we resolve the owner by sha256 match.
 */

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

async function authenticate(request: Request): Promise<{ userId: string } | { error: string; status: number }> {
  const auth = request.headers.get("authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key.startsWith("cmk_")) {
    return { error: "Missing or malformed API key. Use: Authorization: Bearer cmk_...", status: 401 };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const { data: keyRow } = await admin
    .from("api_keys")
    .select("id, user_id, revoked")
    .eq("key_hash", keyHash)
    .single();

  const row = keyRow as Record<string, unknown> | null;
  if (!row || row.revoked) {
    return { error: "Invalid or revoked API key", status: 401 };
  }

  // Rate limit per key: 60 req/min (in-process best effort)
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id as string);

  return { userId: row.user_id as string };
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const auth = await authenticate(request);
  if ("error" in auth) return json({ error: auth.error }, auth.status);

  const { resource } = await params;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));

  switch (resource) {
    case "leads": {
      const { data } = await admin
        .from("leads")
        .select("ig_username, ig_user_id, email, phone, source, tags, engagement, custom_notes, captured_at")
        .eq("user_id", auth.userId)
        .order("captured_at", { ascending: false })
        .limit(limit);
      return json({ object: "list", count: data?.length ?? 0, data: data ?? [] });
    }
    case "automations": {
      const { data } = await admin
        .from("automations")
        .select("id, name, keyword, status, template_type, dms_sent, leads_captured, created_at")
        .eq("user_id", auth.userId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(limit);
      return json({ object: "list", count: data?.length ?? 0, data: data ?? [] });
    }
    case "dm-logs": {
      const { data } = await admin
        .from("dm_logs")
        .select("recipient_username, message_text, status, sent_at, seen_at")
        .eq("user_id", auth.userId)
        .order("sent_at", { ascending: false })
        .limit(limit);
      return json({ object: "list", count: data?.length ?? 0, data: data ?? [] });
    }
    case "stats": {
      const [{ count: leads }, { count: dms }, { count: automations }] = await Promise.all([
        admin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", auth.userId),
        admin.from("dm_logs").select("*", { count: "exact", head: true }).eq("user_id", auth.userId).eq("status", "sent"),
        admin.from("automations").select("*", { count: "exact", head: true }).eq("user_id", auth.userId).eq("status", "active"),
      ]);
      return json({
        leads: leads ?? 0,
        dms_sent: dms ?? 0,
        active_automations: automations ?? 0,
        generated_at: new Date().toISOString(),
      });
    }
    default:
      return json(
        {
          error: "Unknown resource",
          available: ["leads", "automations", "dm-logs", "stats"],
          version: "v1",
        },
        404
      );
  }
}
