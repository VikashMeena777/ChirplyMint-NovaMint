import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared workspaces: a team OWNER works in their own workspace; a team
 * MEMBER (someone who accepted an invite) sees the OWNER's data read-only.
 * Writes always stay scoped to the session user, so members can never
 * mutate the owner's workspace — the read actions below simply resolve
 * which user's data to display.
 */

export interface WorkspaceContext {
  /** the logged-in user */
  userId: string;
  /** whose data the dashboard should read (owner's id for members) */
  workspaceUserId: string;
  isMember: boolean;
  ownerName: string;
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = admin();

  // Ownership wins: if this user has their own team, they work in their
  // own workspace even if they're also a member of someone else's.
  const { count: owned } = await db
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((owned ?? 0) > 0) {
    return { userId: user.id, workspaceUserId: user.id, isMember: false, ownerName: "" };
  }

  // Membership: read the owner's workspace instead.
  const { data: membership } = await db
    .from("team_members")
    .select("owner_id")
    .eq("member_user_id", user.id)
    .limit(1)
    .maybeSingle();
  const m = membership as { owner_id: string } | null;
  if (m?.owner_id) {
    const { data: ownerProfile } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", m.owner_id)
      .single();
    const op = ownerProfile as { full_name?: string; email?: string } | null;
    return {
      userId: user.id,
      workspaceUserId: m.owner_id,
      isMember: true,
      ownerName: op?.full_name || op?.email || "your team owner",
    };
  }

  return { userId: user.id, workspaceUserId: user.id, isMember: false, ownerName: "" };
}

/** Admin client for cross-user (member → owner) reads. */
export function getWorkspaceAdminClient() {
  return admin();
}
