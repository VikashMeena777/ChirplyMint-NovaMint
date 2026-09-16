import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared workspaces: a team OWNER works in their own workspace; a team
 * MEMBER (someone who accepted an invite) sees the OWNER's data with an
 * access level set by their role.
 *
 * Roles (ladder — higher implies everything below):
 *   viewer  — read-only (the pre-roles behavior; legacy 'member' rows map here)
 *   editor  — reply to DMs, manage leads, edit automations & bio pages
 *   admin   — everything except owner-only surfaces
 *   owner   — implicit for one's own workspace; never stored as a member role
 *
 * Owner-only surfaces (enforced per action): billing/plan, connected
 * Instagram accounts & tokens, API keys, webhook/export endpoints, team
 * management (invite/remove/roles), lead exports, ownership transfer.
 */

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type MinRole = WorkspaceRole;

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export function roleAtLeast(role: WorkspaceRole, min: MinRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Plain-language names — shown verbatim in UI (role picker, badges, banner). */
export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin — full access",
  editor: "Editor — can reply & edit",
  viewer: "Viewer — read only",
};

export const ROLE_SHORT: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

/** Map stored values to roles — 'member' is the legacy pre-roles value. */
export function normalizeRole(
  stored: string | null | undefined
): Exclude<WorkspaceRole, "owner"> {
  if (stored === "admin" || stored === "editor" || stored === "viewer") return stored;
  return "viewer";
}

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
  /** effective role in the CURRENT workspace view */
  role: WorkspaceRole;
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
  const pref = jar.get(WORKSPACE_COOKIE)?.value; // "own" | "team"

  // Membership row (if any)
  const { data: membership } = await db
    .from("team_members")
    .select("owner_id, role")
    .eq("member_user_id", user.id)
    .limit(1)
    .maybeSingle();
  const m = membership as { owner_id: string; role?: string } | null;

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
  const memberRole = normalizeRole(m?.role);

  // Explicit switcher preferences: 'own' or 'team' (team works even for
  // owners who are ALSO members of someone else's team).
  if (hasMembership && pref === "own") {
    return {
      userId: user.id,
      workspaceUserId: user.id,
      isMember: false,
      hasMembership,
      ownerName: teamOwnerName,
      role: "owner",
    };
  }
  if (hasMembership && pref === "team") {
    return {
      userId: user.id,
      workspaceUserId: m.owner_id,
      isMember: true,
      hasMembership,
      ownerName: teamOwnerName,
      role: memberRole,
    };
  }

  // Defaults: owners work in their own workspace; pure members see the team.
  if (isOwner) {
    return {
      userId: user.id,
      workspaceUserId: user.id,
      isMember: false,
      hasMembership,
      ownerName: teamOwnerName,
      role: "owner",
    };
  }

  if (hasMembership) {
    return {
      userId: user.id,
      workspaceUserId: m.owner_id,
      isMember: true,
      hasMembership,
      ownerName: await resolveOwnerName(m.owner_id),
      role: memberRole,
    };
  }

  return {
    userId: user.id,
    workspaceUserId: user.id,
    isMember: false,
    hasMembership: false,
    ownerName: "",
    role: "owner",
  };
}

/**
 * Server-side role gate for write actions. The UI's disabled buttons are
 * cosmetic — THIS is the security. Returns the resolved scope on success
 * (user = acting member, targetId = whose data, client = the right
 * Supabase client), or a friendly, actionable error (never a bare 403).
 *
 * Invariant for cross-user writes (IDOR kill): every id-addressed write
 * goes through the returned client with .eq("user_id", targetId) in the
 * SAME statement as the row id; inserts pin user_id: targetId.
 */
export async function requireWorkspaceRole(
  min: MinRole
): Promise<{ ok: false; error: string } | ({ ok: true } & WorkspaceScope)> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { ok: false, error: "Not authenticated" };

  if (!roleAtLeast(scope.role, min)) {
    const what =
      min === "owner" ? "the workspace owner" : `${min[0].toUpperCase()}${min.slice(1)} access`;
    return {
      ok: false,
      error: `You need ${what} to do this. Ask ${scope.ownerName} to upgrade your role.`,
    };
  }
  return { ok: true, ...scope };
}

/** Admin client for cross-user (member → owner) data access. */
export function getWorkspaceAdminClient() {
  return admin();
}

/**
 * One-call scope resolution for workspace-aware actions: whose data to
 * touch (owner's id for members) and which client to use (service-role
 * when crossing users, session client otherwise). Reads for ALL roles;
 * writes must additionally pass requireWorkspaceRole().
 */
export interface WorkspaceScope {
  user: import("@supabase/supabase-js").User;
  targetId: string;
  isCrossUser: boolean;
  /** session-typed client (the service-role client is cast to it — same shape at runtime) */
  client: Awaited<ReturnType<typeof createClient>>;
  isMember: boolean;
  role: WorkspaceRole;
  ownerName: string;
}

export async function resolveWorkspaceScope(): Promise<WorkspaceScope | { user: null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null };
  }
  const ws = await getWorkspaceContext();
  const targetId = ws?.workspaceUserId ?? user.id;
  const isCrossUser = targetId !== user.id;
  return {
    user,
    targetId,
    isCrossUser,
    client: isCrossUser
      ? (admin() as unknown as Awaited<ReturnType<typeof createClient>>)
      : supabase,
    isMember: ws?.isMember ?? false,
    role: ws?.role ?? "owner",
    ownerName: ws?.ownerName ?? "",
  };
}
