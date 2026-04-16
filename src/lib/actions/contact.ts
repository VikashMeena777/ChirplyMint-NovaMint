"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitContactForm(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;

  if (!name || !email || !subject || !message) {
    return { error: "All fields are required." };
  }

  try {
    const supabase = await createClient();

    // Store contact message in activity_log as a system event
    await supabase.from("activity_log").insert({
      user_id: null,
      action: "contact_form.submitted",
      metadata: { name, email, subject, message },
    });

    return { success: true };
  } catch {
    return { error: "Failed to send message. Please try again." };
  }
}
