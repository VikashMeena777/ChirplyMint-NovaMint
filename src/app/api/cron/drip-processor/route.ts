import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendInstagramDM,
  sendGenericTemplate,
  type TemplateButton,
} from "@/lib/instagram/send-dm";

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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        completed++;
        continue;
      }

      const stepData = step as Record<string, unknown>;
      const igUserId = igAccount.ig_user_id;
      const accessToken =
        igAccount.page_access_token || igAccount.access_token;
      const recipientIgId = e.recipient_ig_id as string;
      const recipientUsername = (e.recipient_username as string) || "user";

      // Replace variables in message
      const messageText = (stepData.message_text as string)
        .replace(/\{name\}/gi, `@${recipientUsername}`)
        .replace(/\{step\}/gi, String(nextStepNumber));

      // Send the DM
      let sendResult: {
        success: boolean;
        messageId?: string;
        error?: string;
      };

      const templateType = (stepData.template_type as string) || "text";

      if (templateType === "button" && stepData.template_title) {
        const title = ((stepData.template_title as string) || "")
          .replace(/\{name\}/gi, `@${recipientUsername}`)
          .replace(/\{step\}/gi, String(nextStepNumber));
        const buttons =
          (stepData.template_buttons as TemplateButton[]) || [];

        sendResult = await sendGenericTemplate(
          igUserId,
          accessToken,
          recipientIgId,
          {
            title,
            subtitle: undefined,
            image_url: undefined,
            buttons,
          }
        );
      } else {
        sendResult = await sendInstagramDM(
          igUserId,
          accessToken,
          recipientIgId,
          messageText
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

        if (nextStep) {
          // More steps → advance enrollment
          const nextDelay = (nextStep as Record<string, number>).delay_hours;
          const nextSendAt = new Date(
            Date.now() + nextDelay * 60 * 60 * 1000
          ).toISOString();

          await supabase
            .from("drip_enrollments")
            .update({
              current_step: nextStepNumber,
              next_send_at: nextSendAt,
            })
            .eq("id", e.id as string);
        } else {
          // This was the last step → mark completed
          await supabase
            .from("drip_enrollments")
            .update({
              current_step: nextStepNumber,
              status: "completed",
              completed_at: now,
            })
            .eq("id", e.id as string);
          completed++;
        }

        // Increment DM count on the automation
        supabase
          .from("automations")
          .select("dms_sent")
          .eq("id", automation.id as string)
          .single()
          .then(({ data: autoData }) => {
            const current =
              ((autoData as Record<string, number> | null)?.dms_sent as number) || 0;
            supabase
              .from("automations")
              .update({ dms_sent: current + 1 })
              .eq("id", automation.id as string)
              .then(() => {});
          });

        // Increment user's monthly DM count
        const { data: dmProfile } = await supabase
          .from("profiles")
          .select("dm_count_this_month")
          .eq("id", e.user_id as string)
          .single();
        const dmCurrent = ((dmProfile as Record<string, number> | null)?.dm_count_this_month as number) || 0;
        await supabase
          .from("profiles")
          .update({ dm_count_this_month: dmCurrent + 1 })
          .eq("id", e.user_id as string);

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
            },
          })
          .then(() => {});

        sent++;
        console.log(
          `[Drip Cron] Sent step ${nextStepNumber} to @${recipientUsername}`
        );
      } else {
        // DM failed — mark enrollment as failed after 3 consecutive failures
        // For now, just skip and retry next cycle
        failed++;
        console.error(
          `[Drip Cron] Failed step ${nextStepNumber} to @${recipientUsername}: ${sendResult.error}`
        );
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
