"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

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

  // Increment view count (fire-and-forget)
  supabase
    .from("bio_pages")
    .update({ total_views: ((page as BioPage).total_views || 0) + 1 })
    .eq("id", (page as BioPage).id)
    .then(() => {});

  return { page: page as BioPage, links: (links as BioLink[]) ?? [] };
}

export async function trackBioLinkClick(linkId: string, pageId: string) {
  const supabase = await createClient();

  // Increment click count
  supabase
    .from("bio_links")
    .select("click_count")
    .eq("id", linkId)
    .single()
    .then(({ data }) => {
      const current = ((data as Record<string, number> | null)?.click_count) || 0;
      supabase
        .from("bio_links")
        .update({ click_count: current + 1 })
        .eq("id", linkId)
        .then(() => {});
    });

  // Insert click record
  await supabase.from("bio_link_clicks").insert({ link_id: linkId, page_id: pageId });

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
