import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendInstagramDM,
  sendGenericTemplateDM,
  type TemplateButton,
} from "@/lib/instagram/send-dm";
import {
  getSmartSendHours,
  alignToSmartSendWindow,
} from "@/lib/utils/smart-timing";
import { canSendDM, type PlanKey } from "@/lib/utils/plan-limits";

function isWindowError(msg: string | undefined): boolean {
  if (!msg) return false;
  return /window|24 ?h|human_agent|human agent|outside.*allowed|tag|messaging_window|blocked.*user/i.test(msg);
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Drip Processor Cron Job
 * Runs every hour. Finds active enrollments whose next_send_at has elapsed,
 * sends the next step's DM, and advances the enrollment.
 *
 * Protected by CRON_SECRET.
 * Max 50 enrollments per batch to avoid timeout.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date().toISOString();

    // Get enrollments that are due to send
    const { data: dueEnrollments, error: fetchError } = await supabase
      .from("drip_enrollments")
      .select(
        `
        *,
        drip_sequences!inner(
          id,
          automation_id,
          is_active,
          automations!inner(
            id,
            status,
            instagram_accounts!inner(ig_user_id, access_token, page_access_token)
          )
        )
      `
      )
      .eq("status", "active")
      .lte("next_send_at", now)
      .limit(50);

    if (fetchError) {
      console.error("[Drip Cron] Fetch error:", fetchError);
      return NextResponse.json(
        { status: "error", error: fetchError.message },
        { status: 500 }
      );
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return NextResponse.json({
        status: "ok",
        processed: 0,
        timestamp: now,
      });
    }

    let sent = 0;
    let failed = 0;
    let completed = 0;

    // Smart Send-Times (C10): learn each user's active IST hours once per
    // run and cache them so the batch performs at most one query per user.
    const smartHoursCache = new Map<string, number[]>();
    const smartHoursFor = async (userId: string): Promise<number[]> => {
      const cached = smartHoursCache.get(userId);
      if (cached) return cached;
      const hours = await getSmartSendHours(supabase, userId);
      smartHoursCache.set(userId, hours);
      return hours;
    };

    for (const enrollment of dueEnrollments) {
      const e = enrollment as Record<string, unknown>;
      const sequence = e.drip_sequences as Record<string, unknown>;
      const automation = sequence.automations as Record<string, unknown>;
      const igAccount = automation.instagram_accounts as Record<string, string>;

      // Skip if sequence or automation is inactive
      if (!sequence.is_active || automation.status !== "active") {
        await supabase
          .from("drip_enrollments")
          .update({
            status: "cancelled",
            completed_at: now,
          })
          .eq("id", e.id as string);
        continue;
      }

      // Plan-limit gate (A3): drips must honour purchased dm_limit, not just webhook DMs
      {
        const { data: limitProf } = await supabase
          .from("profiles")
          .select("plan, dm_count_this_month, dm_limit")
          .eq("id", e.user_id as string)
          .maybeSingle();
        const lp = limitProf as Record<string, unknown> | null;
        const lplan = ((lp?.plan as string) || "free") as PlanKey;
        const lcount = (lp?.dm_count_this_month as number) || 0;
        const lcheck = canSendDM(lplan, lcount, lp?.dm_limit as number | null);
        if (!lcheck.allowed) {
          await supabase.from("dm_logs").insert({
            user_id: e.user_id as string,
            automation_id: (automation.id as string) || null,
            recipient_ig_id: e.recipient_ig_id as string,
            recipient_username: (e.recipient_username as string) || "user",
            message_text: `[SKIPPED] Plan DM limit reached (${lcheck.limit}/month) — drip paused`,
            comment_text: null,
            status: "skipped_plan_limit",
          });
          // Back off 24h so we don't hammer the same enrollment hourly all month
          await supabase
            .from("drip_enrollments")
            .update({ next_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
            .eq("id", e.id as string);
          failed++;
          console.log(`[Drip Cron] Plan limit hit for ${e.user_id} (${lcount}/${lcheck.limit}) — pausing drip 24h`);
          continue;
        }
      }

      const nextStepNumber = (e.current_step as number) + 1;

      // Get the next step
      const { data: step } = await supabase
        .from("drip_steps")
        .select("*")
        .eq("sequence_id", sequence.id as string)
        .eq("step_number", nextStepNumber)
        .single();

      if (!step) {
        // No more steps — mark as completed
        await supabase
          .from("drip_enrollments")
          .update({
            status: "completed",
            completed_at: now,
          })
          .eq("id", e.id as string);

        // In-app completion notification (respect drip_completed pref)
        const { data: dprof } = await supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", e.user_id as string)
          .single();
        const dprefs = ((dprof as Record<string, unknown> | null)?.notification_preferences as Record<string, boolean>) ?? {};
        if (dprefs.drip_completed !== false) {
          await supabase.from("notifications").insert({
            user_id: e.user_id as string,
            type: "success",
            title: "🎉 Drip sequence completed!",
            body: `Everyone enrolled in a drip sequence has received every message.`,
            metadata: { enrollment_id: e.id },
          });
        }

        completed++;
        continue;
      }

      const stepData = step as Record<string, unknown>;
      const igUserId = igAccount.ig_user_id;
      const accessToken =
        igAccount.page_access_token || igAccount.access_token;
      const recipientIgId = e.recipient_ig_id as string;
      const recipientUsername = (e.recipient_username as string) || "user";

      // Guard: empty step text would crash .replace() and abort the whole
      // batch. Skip this enrollment cleanly instead.
      const rawText = stepData.message_text as string | null;
      if (!rawText) {
        console.error(`[Drip Cron] Empty message_text for step ${nextStepNumber} — skipping enrollment ${e.id}`);
        await supabase
          .from("drip_enrollments")
          .update({ next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
          .eq("id", e.id as string);
        failed++;
        continue;
      }
      // Replace variables in message
      const messageText = rawText
        .replace(/\{name\}/gi, `@${recipientUsername}`)
        .replace(/\{step\}/gi, String(nextStepNumber));

      // Send the DM
      let sendResult: {
        success: boolean;
        messageId?: string;
        error?: string;
      };

      const templateType = (stepData.template_type as string) || "text";

      // Only use HUMAN_AGENT tag if approved by Meta AND message is outside 24hr window
      const enrolledAt = new Date(e.enrolled_at as string).getTime();
      const hoursSinceEnrollment = (Date.now() - enrolledAt) / (1000 * 60 * 60);
      const useHumanAgent =
        process.env.HUMAN_AGENT_APPROVED === "true" && hoursSinceEnrollment > 24;

      if (templateType === "button" && stepData.template_title) {
        const title = ((stepData.template_title as string) || "")
          .replace(/\{name\}/gi, `@${recipientUsername}`)
          .replace(/\{step\}/gi, String(nextStepNumber));
        const buttons =
          (stepData.template_buttons as TemplateButton[]) || [];

        sendResult = await sendGenericTemplateDM(
          igUserId,
          accessToken,
          recipientIgId,
          {
            title,
            subtitle: undefined,
            image_url: undefined,
            buttons,
          },
          { humanAgent: useHumanAgent, typing: false }
        );
      } else {
        sendResult = await sendInstagramDM(
          igUserId,
          accessToken,
          recipientIgId,
          messageText,
          { humanAgent: useHumanAgent }
        );
      }

      // Log the drip DM
      await supabase.from("dm_logs").insert({
        user_id: e.user_id as string,
        automation_id: automation.id as string,
        recipient_ig_id: recipientIgId,
        recipient_username: recipientUsername,
        message_text: `[DRIP Step ${nextStepNumber}] ${messageText.slice(0, 200)}`,
        comment_text: null,
        status: sendResult.success ? "sent" : "failed",
      });

      if (sendResult.success) {
        // Check if there's a next step after this one
        const { data: nextStep } = await supabase
          .from("drip_steps")
          .select("delay_hours")
          .eq("sequence_id", sequence.id as string)
          .eq("step_number", nextStepNumber + 1)
          .single();

        // Smart Send-Times (C10): set when the next step's schedule was
        // aligned into an active window (noted in the activity metadata).
        let stepSmartAligned = false;

        if (nextStep) {
          // More steps → advance enrollment
          const nextDelay = (nextStep as Record<string, number>).delay_hours;
          // Smart Send-Times (C10): delay_hours is the MINIMUM gap; when the
          // user has learned active hours, align the send into the next one
          // (capped at +8h past the original schedule).
          const minSendAt = new Date(
            Date.now() + nextDelay * 60 * 60 * 1000
          ).toISOString();
          const smartHours = await smartHoursFor(e.user_id as string);
          const nextSendAt = alignToSmartSendWindow(minSendAt, smartHours);
          stepSmartAligned = nextSendAt !== minSendAt;
          if (stepSmartAligned) {
            console.log(
              `[Drip Cron] ⏰ Smart send-time: step ${nextStepNumber + 1} for @${recipientUsername} aligned → ${nextSendAt}`
            );
          }

          await supabase
            .from("drip_enrollments")
            .update({
              current_step: nextStepNumber,
              next_send_at: nextSendAt,
              failure_count: 0,
              last_error: null,
            })
            .eq("id", e.id as string)
            .eq("current_step", e.current_step as number);
        } else {
          // This was the last step → mark completed
          await supabase
            .from("drip_enrollments")
            .update({
              current_step: nextStepNumber,
              status: "completed",
              completed_at: now,
              failure_count: 0,
              last_error: null,
            })
            .eq("id", e.id as string)
            .eq("current_step", e.current_step as number);

          // In-app completion notification (respect drip_completed pref)
          const { data: cprof } = await supabase
            .from("profiles")
            .select("notification_preferences")
            .eq("id", e.user_id as string)
            .single();
          const cprefs = ((cprof as Record<string, unknown> | null)?.notification_preferences as Record<string, boolean>) ?? {};
          if (cprefs.drip_completed !== false) {
          await supabase.from("notifications").insert({
            user_id: e.user_id as string,
            type: "success",
            title: "🎉 Drip sequence completed!",
            body: `@${recipientUsername} just finished the full drip sequence — they've received every message.`,
            metadata: { enrollment_id: e.id, recipient: recipientUsername },
          });
          }

          completed++;
        }

        // Increment counters atomically via hardened RPC (C2: no read-then-write fallback)
        {
          const { error: rpcErr } = await supabase.rpc("increment_field", {
            table_name: "automations",
            field_name: "dms_sent",
            row_id: automation.id as string,
          });
          if (rpcErr) console.error(`[Drip Cron] increment automations.dms_sent failed:`, rpcErr.message);
        }
        {
          const { error: rpcErr2 } = await supabase.rpc("increment_field", {
            table_name: "profiles",
            field_name: "dm_count_this_month",
            row_id: e.user_id as string,
          });
          if (rpcErr2) console.error(`[Drip Cron] increment dm_count_this_month failed:`, rpcErr2.message);
        }

        // Log activity
        supabase
          .from("activity_log")
          .insert({
            user_id: e.user_id as string,
            action: "drip.step_sent",
            metadata: {
              recipient: recipientUsername,
              step: nextStepNumber,
              automation_id: automation.id,
              ...(stepSmartAligned ? { scheduled_by: "smart_timing" } : {}),
            },
          })
          .then(() => {});

        sent++;
        console.log(
          `[Drip Cron] Sent step ${nextStepNumber} to @${recipientUsername}`
        );
      } else {
        // DM failed — finite retries (A2). Window errors (24h closed + no
        // HUMAN_AGENT approval) will never succeed on retry, so fail fast
        // after 2 and notify the owner. Other errors get 3 attempts.
        const errMsg = sendResult.error || "Send failed";
        const windowErr = isWindowError(errMsg);
        const prevFails = (e.failure_count as number) || 0;
        const nextFails = prevFails + 1;
        const maxFails = windowErr ? 2 : 3;
        failed++;
        console.error(
          `[Drip Cron] Failed step ${nextStepNumber} to @${recipientUsername}: ${errMsg} (attempt ${nextFails}/${maxFails}${windowErr ? ", 24h window" : ""})`
        );
        if (nextFails >= maxFails) {
          await supabase
            .from("drip_enrollments")
            .update({
              status: "failed",
              completed_at: now,
              failure_count: nextFails,
              last_error: errMsg.slice(0, 500),
            })
            .eq("id", e.id as string);
          await supabase.from("notifications").insert({
            user_id: e.user_id as string,
            type: "warning",
            title: windowErr ? "⏰ Drip paused — 24h window closed" : "⚠️ Drip step failed",
            body: windowErr
              ? `Step ${nextStepNumber} to @${recipientUsername} couldn't send: the 24h messaging window closed and HUMAN_AGENT isn't approved. Ask them to reply (reopens 24h) or keep steps within 24h.`
              : `Step ${nextStepNumber} to @${recipientUsername} failed ${maxFails}x: ${errMsg.slice(0, 140)}. The enrollment was paused.`,
            metadata: { enrollment_id: e.id, step: nextStepNumber, error: errMsg.slice(0, 200) },
          });
        } else {
          await supabase
            .from("drip_enrollments")
            .update({
              failure_count: nextFails,
              last_error: errMsg.slice(0, 500),
              next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            })
            .eq("id", e.id as string);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      processed: dueEnrollments.length,
      sent,
      failed,
      completed,
      timestamp: now,
    });
  } catch (err) {
    console.error("[Drip Cron] Error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
