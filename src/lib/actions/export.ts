"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────

export interface LeadExportRecord {
  id: string;
  user_id: string;
  export_type: "csv" | "webhook";
  destination: string | null;
  records_exported: number;
  status: "completed" | "failed";
  created_at: string;
}

export interface WebhookConfig {
  url: string;
  auto_push: boolean;
}

// ─── CSV Export ──────────────────────────────────────────

/**
 * Export all leads as CSV data. Returns the CSV string directly.
 */
export async function exportLeadsCSV() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: leads, error } = await supabase
    .from("leads")
    .select("ig_username, ig_user_id, email, phone, notes, tags, custom_notes, source, created_at, automations:automation_id(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  if (!leads || leads.length === 0) {
    return { data: null, error: "No leads to export" };
  }

  // Build CSV
  const headers = [
    "Instagram Username",
    "IG User ID",
    "Email",
    "Phone",
    "Notes",
    "Tags",
    "Custom Notes",
    "Source",
    "Automation",
    "Captured At",
  ];

  const rows = leads.map((lead) => {
    const l = lead as Record<string, unknown>;
    const automation = l.automations as Record<string, string> | null;
    return [
      escapeCsv((l.ig_username as string) || ""),
      escapeCsv((l.ig_user_id as string) || ""),
      escapeCsv((l.email as string) || ""),
      escapeCsv((l.phone as string) || ""),
      escapeCsv((l.notes as string) || ""),
      escapeCsv(Array.isArray(l.tags) ? (l.tags as string[]).join("; ") : ""),
      escapeCsv((l.custom_notes as string) || ""),
      escapeCsv((l.source as string) || ""),
      escapeCsv(automation?.name || "Manual"),
      escapeCsv(
        l.created_at
          ? new Date(l.created_at as string).toISOString()
          : ""
      ),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  // Log the export
  await supabase.from("lead_exports").insert({
    user_id: user.id,
    export_type: "csv",
    destination: null,
    records_exported: leads.length,
    status: "completed",
  });

  logActivity(user.id, "leads.exported_csv", {
    count: leads.length,
  }).catch(() => {});

  revalidatePath("/dashboard/leads");
  return { data: csv, error: null, count: leads.length };
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Webhook Export ─────────────────────────────────────

/**
 * Send all leads to a webhook URL via POST request.
 */
export async function exportLeadsWebhook(webhookUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate URL
  try {
    new URL(webhookUrl);
  } catch {
    return { error: "Invalid webhook URL" };
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("ig_username, ig_user_id, email, phone, notes, tags, custom_notes, source, created_at, automations:automation_id(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  if (!leads || leads.length === 0) return { error: "No leads to export" };

  // Format for webhook
  const payload = {
    source: "chirplymint",
    exported_at: new Date().toISOString(),
    total_leads: leads.length,
    leads: leads.map((lead) => {
      const l = lead as Record<string, unknown>;
      const automation = l.automations as Record<string, string> | null;
      return {
        ig_username: l.ig_username || null,
        ig_user_id: l.ig_user_id || null,
        email: l.email || null,
        phone: l.phone || null,
        notes: l.notes || null,
        tags: Array.isArray(l.tags) ? l.tags : [],
        custom_notes: l.custom_notes || null,
        source: l.source || null,
        automation_name: automation?.name || null,
        captured_at: l.created_at || null,
      };
    }),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ChirplyMint/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const status = response.ok ? "completed" : "failed";

    await supabase.from("lead_exports").insert({
      user_id: user.id,
      export_type: "webhook",
      destination: webhookUrl,
      records_exported: leads.length,
      status,
    });

    if (!response.ok) {
      return {
        error: `Webhook returned ${response.status}: ${response.statusText}`,
      };
    }

    logActivity(user.id, "leads.exported_webhook", {
      url: webhookUrl,
      count: leads.length,
    }).catch(() => {});

    revalidatePath("/dashboard/leads");
    return { success: true, count: leads.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook request failed";

    await supabase.from("lead_exports").insert({
      user_id: user.id,
      export_type: "webhook",
      destination: webhookUrl,
      records_exported: 0,
      status: "failed",
    });

    return { error: message };
  }
}

/**
 * Test a webhook URL by sending a sample payload.
 */
export async function testWebhook(webhookUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    new URL(webhookUrl);
  } catch {
    return { error: "Invalid webhook URL" };
  }

  const testPayload = {
    source: "chirplymint",
    test: true,
    exported_at: new Date().toISOString(),
    total_leads: 1,
    leads: [
      {
        ig_username: "test_user",
        ig_user_id: "123456789",
        email: null,
        phone: null,
        notes: "This is a test lead from ChirplyMint",
        source: "dm",
        automation_name: "Test Automation",
        captured_at: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ChirplyMint/1.0",
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        error: `Webhook returned ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, message: "Test webhook sent successfully!" };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Webhook test failed",
    };
  }
}

/**
 * Get export history for the current user.
 */
export async function getExportHistory(limit = 20) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("lead_exports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: error?.message };
}
