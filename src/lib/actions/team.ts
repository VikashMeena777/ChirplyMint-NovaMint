"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

/**
 * D6: Team seats (Business plan). Owner invites teammates by email; the
 * teammate accepts via /invite/<token> while logged in. Seat limit: 3.
 */

const SEAT_LIMIT = 3;

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface TeamMemberRow {
  id: string;
  member_email: string;
  member_user_id: string;
  role: string;
  created_at: string;
}

export interface TeamInviteRow {
  id: string;
  email: string;
  token: string;
  status: string;
  created_at: string;
}

export async function getTeam(): Promise<{
  members: TeamMemberRow[];
  invites: TeamInviteRow[];
  seatLimit: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [], invites: [], seatLimit: SEAT_LIMIT };

  const admin = getAdmin();
  const [members, invites] = await Promise.all([
    admin
      .from("team_members")
      .select("id, member_email, member_user_id, role, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    admin
      .from("team_invites")
      .select("id, email, token, status, created_at")
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return {
    members: (members.data as unknown as TeamMemberRow[]) ?? [],
    invites: (invites.data as unknown as TeamInviteRow[]) ?? [],
    seatLimit: SEAT_LIMIT,
  };
}

export async function inviteTeamMember(
  email: string
): Promise<{ inviteUrl?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Business plan only
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, email")
    .eq("id", user.id)
    .single();
  const p = profile as Record<string, string> | null;
  if (p?.plan !== "business") {
    return { error: "Team seats are available on the Business plan" };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { error: "Enter a valid email address" };
  }

  const admin = getAdmin();
  const [{ count: memberCount }, { data: existingInvite }] = await Promise.all([
    admin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id),
    admin
      .from("team_invites")
      .select("id, token")
      .eq("owner_id", user.id)
      .eq("email", cleanEmail)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if ((memberCount ?? 0) >= SEAT_LIMIT) {
    return { error: `Team is full (${SEAT_LIMIT} seats). Remove a member to invite someone new.` };
  }
  const invite = existingInvite as { token: string } | null;
  if (invite) {
    return {
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.token}`,
    };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { error } = await admin.from("team_invites").insert({
    owner_id: user.id,
    email: cleanEmail,
    token,
    invited_by_email: p?.email || null,
  });
  if (error) return { error: error.message };

  logActivity(user.id, "team.invited", { email: cleanEmail }).catch(() => {});
  revalidatePath("/dashboard/settings");
  return { inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${token}` };
}

export async function revokeInvite(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

export async function removeTeamMember(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };
  logActivity(user.id, "team.member_removed", { member_id: id }).catch(() => {});
  revalidatePath("/dashboard/settings");
  return {};
}

/**
 * Accept an invite — called by the /invite/[token] page while logged in.
 * Only works if the logged-in user's account email matches the invite.
 */
export async function acceptTeamInvite(
  token: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in first, then open the invite link again." };

  const admin = getAdmin();
  const { data: inv } = await admin
    .from("team_invites")
    .select("id, owner_id, email, status")
    .eq("token", token)
    .single();
  const invite = inv as Record<string, string> | null;
  if (!invite || invite.status !== "pending") {
    return { error: "This invite is no longer valid." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();
  const myEmail = ((profile as Record<string, string> | null)?.email || "").toLowerCase();

  if (myEmail !== invite.email.toLowerCase()) {
    return {
      error: `This invite was sent to ${invite.email} — log in with that account to accept it.`,
    };
  }

  if (invite.owner_id === user.id) {
    return { error: "You can't accept your own invite." };
  }

  // Seat check
  const { count } = await admin
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", invite.owner_id);
  if ((count ?? 0) >= SEAT_LIMIT) {
    return { error: "The team is full." };
  }

  const { error: joinErr } = await admin.from("team_members").upsert({
    owner_id: invite.owner_id,
    member_user_id: user.id,
    member_email: myEmail,
    role: "member",
  }, { onConflict: "owner_id,member_user_id" });
  if (joinErr) return { error: joinErr.message };

  await admin
    .from("team_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  logActivity(invite.owner_id, "team.member_joined", { email: myEmail }).catch(() => {});
  logActivity(user.id, "team.joined", { owner_id: invite.owner_id }).catch(() => {});
  return { success: true };
}
