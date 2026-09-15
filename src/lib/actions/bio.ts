"use server";

import { PLANS, canCustomizeBioStyle, canHideBranding, type PlanKey } from "@/lib/utils/plan-limits";
import { getUserPlan } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ───────────────────────────────────────────────

export interface BioPage {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  bio: string;
  theme: string;
  accent_color: string;
  show_avatar: boolean;
  avatar_url: string | null;
  is_published: boolean;
  total_views: number;
  custom_font: string | null;
  hide_branding: boolean;
  card_border_radius: string;
  card_opacity: number;
  created_at: string;
  updated_at: string;
}

export interface BioLink {
  id: string;
  page_id: string;
  user_id: string;
  title: string;
  url: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
}

// ─── Page CRUD ───────────────────────────────────────────

export async function getBioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bio_pages")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data: data as BioPage | null, error: null };
}

export async function createBioPage(slug: string, displayName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Validate slug
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  if (cleanSlug.length < 3) return { data: null, error: "Slug must be at least 3 characters" };

  // Check if slug is taken
  const { data: existing } = await supabase
    .from("bio_pages")
    .select("id")
    .eq("slug", cleanSlug)
    .single();

  if (existing) return { data: null, error: "This username is already taken" };

  // Check if user already has a page
  const { data: userPage } = await supabase
    .from("bio_pages")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (userPage) return { data: null, error: "You already have a bio page" };

  const { data, error } = await supabase
    .from("bio_pages")
    .insert({
      user_id: user.id,
      slug: cleanSlug,
      display_name: displayName || cleanSlug,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  logActivity(user.id, "bio.page_created", { slug: cleanSlug }).catch(() => {});
  revalidatePath("/dashboard/bio");
  return { data: data as BioPage, error: null };
}

export async function updateBioPage(updates: {
  display_name?: string;
  bio?: string;
  theme?: string;
  accent_color?: string;
  show_avatar?: boolean;
  avatar_url?: string | null;
  is_published?: boolean;
  custom_font?: string | null;
  hide_branding?: boolean;
  card_border_radius?: string;
  card_opacity?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Server-side white-label enforcement: custom font (Pro+) and
  // hide-branding (Business) are plan features — strip them for lower plans
  // instead of trusting the client.
  {
    const plan = await getUserPlan();
    if (!canCustomizeBioStyle(plan) && "custom_font" in (updates as Record<string, unknown>)) {
      delete (updates as Record<string, unknown>).custom_font;
    }
    if (!canHideBranding(plan) && "hide_branding" in (updates as Record<string, unknown>)) {
      delete (updates as Record<string, unknown>).hide_branding;
    }
  }

  const { error } = await supabase
    .from("bio_pages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "bio.page_updated", updates).catch(() => {});
  revalidatePath("/dashboard/bio");
  return { success: true };
}

// ─── Link CRUD ───────────────────────────────────────────

export async function getBioLinks(pageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bio_links")
    .select("*")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data as BioLink[]) ?? [], error: null };
}

export async function addBioLink(pageId: string, link: {
  title: string;
  url: string;
  emoji?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Plan limit: Starter caps bio links (5); Pro+ unlimited
  const plan = await getUserPlan();
  const bioLinkLimit = PLANS[plan]?.bioLinkLimit ?? 5;
  if (bioLinkLimit !== -1) {
    const { count } = await supabase
      .from("bio_links")
      .select("id", { count: "exact", head: true })
      .eq("page_id", (await supabase.from("bio_pages").select("id").eq("user_id", user.id).single()).data?.id ?? "");
    if ((count ?? 0) >= bioLinkLimit) {
      return { error: `Your plan allows ${bioLinkLimit} bio links — upgrade to Pro for unlimited links.` };
    }
  }

  // Get next sort order
  const { count } = await supabase
    .from("bio_links")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);

  const { data, error } = await supabase
    .from("bio_links")
    .insert({
      page_id: pageId,
      user_id: user.id,
      title: link.title,
      url: link.url,
      emoji: link.emoji || "🔗",
      sort_order: (count ?? 0),
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity(user.id, "bio.link_added", { title: link.title }).catch(() => {});
  revalidatePath("/dashboard/bio");
  return { success: true, data: data as BioLink };
}

export async function updateBioLink(linkId: string, updates: {
  title?: string;
  url?: string;
  emoji?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("bio_links")
    .update(updates)
    .eq("id", linkId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bio");
  return { success: true };
}

export async function deleteBioLink(linkId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("bio_links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "bio.link_deleted", { link_id: linkId }).catch(() => {});
  revalidatePath("/dashboard/bio");
  return { success: true };
}

export async function reorderBioLinks(pageId: string, orderedIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("bio_links")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard/bio");
  return { success: true };
}

// ─── Public read (no auth required) ─────────────────────

export async function getPublicBioPage(slug: string) {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("bio_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!page) return { page: null, links: [] };

  const { data: links } = await supabase
    .from("bio_links")
    .select("*")
    .eq("page_id", (page as BioPage).id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Increment view count (fire-and-forget). Anonymous visitors → the
  // service-role client, or RLS silently drops the write (views never
  // counted before this fix). RPC increment = race-free.
  getAdmin()
    .rpc("increment_field", {
      table_name: "bio_pages",
      row_id: (page as BioPage).id,
      field_name: "total_views",
      increment_by: 1,
    })
    .then(() => {});

  return { page: page as BioPage, links: (links as BioLink[]) ?? [] };
}

export async function trackBioLinkClick(
  linkId: string,
  pageId: string,
  leadIgId?: string
) {
  // Public visitors are ANONYMOUS — the session client's writes are silently
  // blocked by RLS, which is why click counts never moved before. Use the
  // service-role client, but only after validating the page is a real,
  // published bio page (this action is callable by anyone).
  const admin = getAdmin();

  const { data: page } = await admin
    .from("bio_pages")
    .select("id, user_id, is_published")
    .eq("id", pageId)
    .single();
  const pageRow = page as { id: string; user_id: string; is_published: boolean } | null;
  if (!pageRow || !pageRow.is_published) {
    // Unpublished or unknown page — don't record anything
    return { success: false };
  }

  // Race-free increment via the shared RPC (read-modify-write lost clicks
  // under concurrent taps)
  admin
    .rpc("increment_field", {
      table_name: "bio_links",
      row_id: linkId,
      field_name: "click_count",
      increment_by: 1,
    })
    .then(() => {});
  // (RPC returns PromiseLike; errors surface in server logs via Next)

  // Insert click record — attributed to a lead when the DM link carried
  // the ?cmk_lead= tag (D9 revenue attribution)
  await admin.from("bio_link_clicks").insert({
    link_id: linkId,
    page_id: pageId,
    ...(leadIgId ? { lead_ig_id: leadIgId } : {}),
  });

  // A lead clicking through from their DM = strong interest
  if (leadIgId) {
    const { data: lead } = await admin
      .from("leads")
      .select("id, engagement")
      .eq("user_id", pageRow.user_id)
      .eq("ig_user_id", leadIgId)
      .limit(1)
      .maybeSingle();
    const row = lead as Record<string, unknown> | null;
    if (row && row.engagement !== "converted") {
      await admin.from("leads").update({ engagement: "interested" }).eq("id", row.id as string);
    }
  }

  return { success: true };
}

// ─── Analytics ──────────────────────────────────────────

export async function getBioAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalViews: 0, totalClicks: 0, links: [] };

  const { data: page } = await supabase
    .from("bio_pages")
    .select("id, total_views")
    .eq("user_id", user.id)
    .single();

  if (!page) return { totalViews: 0, totalClicks: 0, links: [] };

  const p = page as BioPage;

  const { data: links } = await supabase
    .from("bio_links")
    .select("id, title, emoji, click_count, url")
    .eq("page_id", p.id)
    .eq("user_id", user.id)
    .order("click_count", { ascending: false });

  const totalClicks = (links ?? []).reduce(
    (sum, l) => sum + ((l as Record<string, number>).click_count || 0), 0
  );

  return {
    totalViews: p.total_views || 0,
    totalClicks,
    links: (links ?? []) as BioLink[],
  };
}
