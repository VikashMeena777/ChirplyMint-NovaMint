import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Monthly DM Count Reset Cron
 * Runs on the 1st of each month via cron-job.org.
 *
 * ONLY resets FREE users' DM counts. Paid users' counts are reset
 * by the subscription-check cron on their individual billing cycle.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date().toISOString();

    // Reset DM count ONLY for free-plan users
    const { data, error } = await supabase
      .from("profiles")
      .update({
        dm_count_this_month: 0,
        dm_count_reset_at: now,
      })
      .eq("plan", "free")
      .select("id");

    if (error) {
      console.error("[DM Reset] Error:", error);
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    const count = data?.length ?? 0;
    console.log(`[DM Reset] Reset DM counts for ${count} free users at ${now}`);

    return NextResponse.json({
      status: "ok",
      reset_count: count,
      timestamp: now,
    });
  } catch (err) {
    console.error("[DM Reset] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
