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
  if (target === "own") {
    jar.set(WORKSPACE_COOKIE, "own", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    // back to the team (the default) — clearing re-enables team resolution
    jar.delete(WORKSPACE_COOKIE);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/automations");
  revalidatePath("/dashboard/leads");
  return {};
}

/** Which workspace is active + whether a switch is available at all. */
export async function getWorkspaceSwitchState(): Promise<{
  isMember: boolean;
  viewingTeam: boolean;
  ownerName: string;
}> {
  const { getWorkspaceContext } = await import("@/lib/workspace");
  const ctx = await getWorkspaceContext();
  return {
    isMember: ctx?.isMember ?? false,
    viewingTeam: ctx?.isMember ?? false,
    ownerName: ctx?.ownerName ?? "",
  };
}
