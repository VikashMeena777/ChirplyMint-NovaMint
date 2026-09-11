"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

/**
 * Workspace switcher: members with their own account can flip between
 * their personal workspace and the team's. Persists in a cookie that
 * getWorkspaceContext reads on every request.
 */
export async function switchWorkspace(target: "own" | "team"): Promise<{ error?: string }> {
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, target, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/automations");
  revalidatePath("/dashboard/leads");
  return {};
}

/** Which workspace is active + whether a switch is available at all. */
export async function getWorkspaceSwitchState(): Promise<{
  hasMembership: boolean;
  viewingTeam: boolean;
  ownerName: string;
}> {
  const { getWorkspaceContext } = await import("@/lib/workspace");
  const ctx = await getWorkspaceContext();
  return {
    hasMembership: ctx?.hasMembership ?? false,
    viewingTeam: ctx?.isMember ?? false,
    ownerName: ctx?.ownerName ?? "",
  };
}
