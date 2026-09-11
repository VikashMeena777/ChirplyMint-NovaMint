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
  /** currently VIEWING the team workspace? (drives the banner) */
  isMember: boolean;
  /** belongs to someone's team at all (drives the switcher) */
  hasMembership: boolean;
  ownerName: string;
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const WORKSPACE_COOKIE = "cm_ws";

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = admin();
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const pref = jar.get(WORKSPACE_COOKIE)?.value; // "own" | owner-uuid

  // Membership row (if any)
  const { data: membership } = await db
    .from("team_members")
    .select("owner_id")
    .eq("member_user_id", user.id)
    .limit(1)
    .maybeSingle();
  const m = membership as { owner_id: string } | null;

  const resolveOwnerName = async (ownerId: string) => {
    const { data: ownerProfile } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", ownerId)
      .single();
    const op = ownerProfile as { full_name?: string; email?: string } | null;
    return op?.full_name || op?.email || "your team owner";
  };

  // Ownership wins unless the user is ONLY a member (no team of their own)
  // and hasn't explicitly switched to "own".
  const { count: owned } = await db
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);
  const isOwner = (owned ?? 0) > 0;

  const hasMembership = !!m?.owner_id;
  // The switcher always needs the team owner's name — resolve once whenever
  // a membership exists (even while viewing the personal workspace).
  const teamOwnerName = hasMembership ? await resolveOwnerName(m.owner_id) : "";

  // Explicit switcher preferences: 'own' or 'team' (team works even for
  // owners who are ALSO members of someone else's team).
  if (hasMembership && pref === "own") {
    return { userId: user.id, workspaceUserId: user.id, isMember: false, hasMembership, ownerName: teamOwnerName };
  }
  if (hasMembership && pref === "team") {
    return {
      userId: user.id,
      workspaceUserId: m.owner_id,
      isMember: true,
      hasMembership,
      ownerName: teamOwnerName,
    };
  }

  // Defaults: owners work in their own workspace; pure members see the team.
  if (isOwner) {
    return { userId: user.id, workspaceUserId: user.id, isMember: false, hasMembership, ownerName: teamOwnerName };
  }

  if (hasMembership) {
    return {
      userId: user.id,
      workspaceUserId: m.owner_id,
      isMember: true,
      hasMembership,
      ownerName: await resolveOwnerName(m.owner_id),
    };
  }

  return { userId: user.id, workspaceUserId: user.id, isMember: false, hasMembership: false, ownerName: "" };
}

/** Admin client for cross-user (member → owner) reads. */
export function getWorkspaceAdminClient() {
  return admin();
}
