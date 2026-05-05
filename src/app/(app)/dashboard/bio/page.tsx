"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getBioPage,
  createBioPage,
  updateBioPage,
  getBioLinks,
  addBioLink,
  updateBioLink,
  deleteBioLink,
  reorderBioLinks,
  getBioAnalytics,
  type BioPage,
  type BioLink,
} from "@/lib/actions/bio";
import { getProfile } from "@/lib/actions/dashboard";
import {
  canCustomizeBioStyle,
  canHideBranding,
  type PlanKey,
} from "@/lib/utils/plan-limits";
import {
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  BarChart3,
  Globe,
  Sparkles,
  Save,
  Copy,
  Check,
  Palette,
  ArrowUpDown,
  MousePointerClick,
  Camera,
  Loader2,
  Lock,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { resizeImageToBase64 } from "@/lib/utils/image-resize";

// ─── Built-in Font Options ──────────────────────────────

const FONTS = [
  { id: "system", label: "System Default", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: "inter", label: "Inter", family: "'Inter', sans-serif" },
  { id: "poppins", label: "Poppins", family: "'Poppins', sans-serif" },
  { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif" },
  { id: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { id: "space-grotesk", label: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
  { id: "plus-jakarta", label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif" },
] as const;

const BORDER_RADIUS_OPTIONS = [
  { id: "sharp", label: "Sharp", value: "4px" },
  { id: "rounded", label: "Rounded", value: "12px" },
  { id: "pill", label: "Pill", value: "9999px" },
] as const;

// ─── Theme Presets ───────────────────────────────────────

const THEMES = [
  { id: "midnight", label: "Midnight", bg: "bg-[#0f0f23]", text: "text-white" },
  { id: "ocean", label: "Ocean", bg: "bg-gradient-to-br from-[#0c1445] to-[#1a3a6c]", text: "text-white" },
  { id: "forest", label: "Forest", bg: "bg-gradient-to-br from-[#0a1f0a] to-[#1a3d1a]", text: "text-white" },
  { id: "sunset", label: "Sunset", bg: "bg-gradient-to-br from-[#2d1b42] to-[#441a2a]", text: "text-white" },
  { id: "snow", label: "Snow", bg: "bg-[#f8f9fa]", text: "text-gray-900" },
  { id: "lavender", label: "Lavender", bg: "bg-gradient-to-br from-[#e8e0f0] to-[#d4c5e8]", text: "text-gray-900" },
];

const EMOJIS = ["🔗", "🌐", "📸", "🎵", "🎬", "📱", "💼", "🛒", "📧", "💬", "🎯", "🚀", "❤️", "⭐", "🎨", "📝"];

export default function BioBuilderPage() {
  const [page, setPage] = useState<BioPage | null>(null);
  const [links, setLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Edit state
  const [editBio, setEditBio] = useState("");
  const [editTheme, setEditTheme] = useState("midnight");
  const [editAccent, setEditAccent] = useState("#8b5cf6");
  const [isPublished, setIsPublished] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);

  // Branding state
  const [editFont, setEditFont] = useState<string | null>(null);
  const [editHideBranding, setEditHideBranding] = useState(false);
  const [editCardRadius, setEditCardRadius] = useState("rounded");
  const [editCardOpacity, setEditCardOpacity] = useState(100);
  const [userPlan, setUserPlan] = useState<PlanKey>("free");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Add link form
  const [showAddLink, setShowAddLink] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEmoji, setNewEmoji] = useState("🔗");

  // Analytics
  const [analytics, setAnalytics] = useState({ totalViews: 0, totalClicks: 0 });

  // Tab
  const [activeTab, setActiveTab] = useState<"editor" | "theme" | "analytics">("editor");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await getBioPage();
    // Load user plan
    const profile = await getProfile();
    if (profile) setUserPlan((profile.plan || "free") as PlanKey);

    if (data) {
      setPage(data);
      setEditBio(data.bio || "");
      setEditTheme(data.theme);
      setEditAccent(data.accent_color || "#8b5cf6");
      setIsPublished(data.is_published);
      setEditAvatarUrl(data.avatar_url || null);
      // Load branding
      setEditFont(data.custom_font || null);
      setEditHideBranding(data.hide_branding || false);
      setEditCardRadius(data.card_border_radius || "rounded");
      setEditCardOpacity(data.card_opacity ?? 100);
      const { data: linkData } = await getBioLinks(data.id);
      setLinks(linkData);
      const analyticsData = await getBioAnalytics();
      setAnalytics({ totalViews: analyticsData.totalViews, totalClicks: analyticsData.totalClicks });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Create Page ───────────────────────────────────────

  async function handleCreate() {
    if (!slug.trim()) return toast.error("Enter a username");
    setSaving(true);
    const { data, error } = await createBioPage(slug.trim(), displayName.trim());
    if (error) { toast.error(error); setSaving(false); return; }
    toast.success("Bio page created!");
    setPage(data);
    if (data) {
      setEditBio(data.bio || "");
      setEditTheme(data.theme);
      setEditAccent(data.accent_color || "#8b5cf6");
      setEditAvatarUrl((data as BioPage).avatar_url || null);
    }
    setSaving(false);
  }

  // ─── Save Settings ────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    const { error } = await updateBioPage({
      bio: editBio,
      theme: editTheme,
      accent_color: editAccent,
      is_published: isPublished,
      avatar_url: editAvatarUrl,
      show_avatar: !!editAvatarUrl,
      custom_font: canCustomizeBioStyle(userPlan) ? editFont : undefined,
      hide_branding: canHideBranding(userPlan) ? editHideBranding : undefined,
      card_border_radius: canCustomizeBioStyle(userPlan) ? editCardRadius : undefined,
      card_opacity: canCustomizeBioStyle(userPlan) ? editCardOpacity : undefined,
    });
    if (error) toast.error(error);
    else toast.success("Changes saved!");
    setSaving(false);
  }

  // ─── Avatar Upload ────────────────────────────────────

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const dataUrl = await resizeImageToBase64(file, 256);
      setEditAvatarUrl(dataUrl);
      toast.success("Avatar updated! Click Save to apply.");
    } catch {
      toast.error("Failed to process image");
    }
    setAvatarUploading(false);
  }

  // ─── Add Link ──────────────────────────────────────────

  async function handleAddLink() {
    if (!page || !newTitle.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    const { error } = await addBioLink(page.id, { title: newTitle.trim(), url, emoji: newEmoji });
    if (error) { toast.error(error); return; }
    toast.success("Link added!");
    setNewTitle(""); setNewUrl(""); setNewEmoji("🔗"); setShowAddLink(false);
    const { data } = await getBioLinks(page.id);
    setLinks(data);
  }

  // ─── Toggle Link ───────────────────────────────────────

  async function handleToggleLink(linkId: string, active: boolean) {
    await updateBioLink(linkId, { is_active: !active });
    setLinks(links.map(l => l.id === linkId ? { ...l, is_active: !active } : l));
  }

  // ─── Delete Link ───────────────────────────────────────

  async function handleDeleteLink(linkId: string) {
    await deleteBioLink(linkId);
    setLinks(links.filter(l => l.id !== linkId));
    toast.success("Link removed");
  }

  // ─── Move Link ─────────────────────────────────────────

  async function moveLink(idx: number, direction: -1 | 1) {
    if (!page) return;
    const newLinks = [...links];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newLinks.length) return;
    [newLinks[idx], newLinks[targetIdx]] = [newLinks[targetIdx], newLinks[idx]];
    setLinks(newLinks);
    await reorderBioLinks(page.id, newLinks.map(l => l.id));
  }

  // ─── Copy URL ──────────────────────────────────────────

  function copyUrl() {
    if (!page) return;
    const url = `${window.location.origin}/u/${page.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Loading ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-[400px] bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ─── Create Page (No page yet) ─────────────────────────

  if (!page) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card-elevated rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Link2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Your Link-in-Bio</h1>
            <p className="text-muted-foreground mt-2">
              Set up a beautiful landing page with all your important links. Share one URL everywhere.
            </p>
          </div>

          <div className="space-y-4 text-left max-w-sm mx-auto">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username / Slug</label>
              <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <span className="px-3 py-2.5 bg-muted text-sm text-muted-foreground border-r border-border shrink-0">
                  chirplymint.novamintnetworks.in/u/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="yourname"
                  maxLength={30}
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name or Brand"
                maxLength={50}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || !slug.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-mint text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {saving ? "Creating..." : "Create My Page"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Editor ───────────────────────────────────────

  const pageUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/u/${page.slug}`;
  const selectedTheme = THEMES.find(t => t.id === editTheme) || THEMES[0];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            Link-in-Bio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build & customize your bio landing page</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyUrl} className="px-3 py-2 text-xs rounded-xl border border-border hover:bg-muted/60 flex items-center gap-1.5 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy URL"}
          </button>
          <Link href={`/u/${page.slug}`} target="_blank" className="px-3 py-2 text-xs rounded-xl border border-border hover:bg-muted/60 flex items-center gap-1.5 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </Link>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs rounded-xl bg-gradient-mint text-white font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl w-fit">
        {[
          { id: "editor" as const, label: "Editor", icon: Link2 },
          { id: "theme" as const, label: "Theme", icon: Palette },
          { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Editor Panel */}
        <div className="lg:col-span-3 space-y-5">

          {/* ─── Editor Tab ─── */}
          {activeTab === "editor" && (
            <>
              {/* Page Settings */}
              <div className="card-elevated rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Page Details</h2>

                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div
                      className="w-16 h-16 rounded-full border-[3px] flex items-center justify-center text-xl font-bold overflow-hidden"
                      style={{ borderColor: editAccent, backgroundColor: editAccent + "22" }}
                    >
                      {editAvatarUrl ? (
                        <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (page.display_name || page.slug).charAt(0).toUpperCase()
                      )}
                    </div>
                    <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      {avatarUploading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={avatarUploading}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Hover to upload (max 5MB)</p>
                    {editAvatarUrl && (
                      <button
                        onClick={() => { setEditAvatarUrl(null); toast.success("Avatar removed. Click Save to apply."); }}
                        className="text-xs text-red-400 hover:text-red-600 mt-0.5"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL</label>
                    <div className="px-3 py-2 text-sm bg-muted/40 rounded-lg border border-border text-muted-foreground truncate">
                      /u/{page.slug}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <button
                      onClick={() => setIsPublished(!isPublished)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors w-full ${isPublished
                          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                          : "bg-muted/40 border-border text-muted-foreground"
                        }`}
                    >
                      {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {isPublished ? "Published" : "Draft"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write a short bio..."
                    maxLength={200}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">{editBio.length}/200</p>
                </div>
              </div>

              {/* Links */}
              <div className="card-elevated rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Links ({links.length})</h2>
                  <button
                    onClick={() => setShowAddLink(!showAddLink)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Link
                  </button>
                </div>

                {/* Add Link Form */}
                {showAddLink && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex gap-2 items-start">
                      {/* Emoji Picker */}
                      <div className="relative group">
                        <button className="w-10 h-10 rounded-lg border border-border bg-card text-lg flex items-center justify-center hover:bg-muted/60">
                          {newEmoji}
                        </button>
                        <div className="absolute top-12 left-0 z-10 hidden group-hover:grid grid-cols-4 gap-1 p-2 bg-card border border-border rounded-xl shadow-lg w-[160px]">
                          {EMOJIS.map(e => (
                            <button key={e} onClick={() => setNewEmoji(e)} className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center text-lg">
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Link title"
                          maxLength={60}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddLink(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/60">Cancel</button>
                      <button onClick={handleAddLink} disabled={!newTitle.trim() || !newUrl.trim()} className="px-4 py-1.5 text-xs rounded-lg bg-gradient-mint text-white font-semibold disabled:opacity-50">
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Links List */}
                {links.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No links yet. Add your first link to get started!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {links.map((link, idx) => (
                      <div
                        key={link.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${link.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                          }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30">
                            <ArrowUpDown className="w-3 h-3 rotate-180" />
                          </button>
                          <button onClick={() => moveLink(idx, 1)} disabled={idx === links.length - 1} className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30">
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-lg shrink-0">{link.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3" /> {link.click_count}
                        </span>
                        <button onClick={() => handleToggleLink(link.id, link.is_active)} className="p-1.5 rounded-lg hover:bg-muted/60">
                          {link.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => handleDeleteLink(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── Theme Tab ─── */}
          {activeTab === "theme" && (
            <div className="space-y-5">
              <div className="card-elevated rounded-2xl p-5 space-y-5">
                <h2 className="text-sm font-semibold text-foreground">Choose Theme</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setEditTheme(theme.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${editTheme === theme.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                        }`}
                    >
                      <div className={`w-full h-16 rounded-lg ${theme.bg} mb-2`} />
                      <span className="text-xs font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Accent Color</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editAccent}
                      onChange={(e) => setEditAccent(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{editAccent}</span>
                  </div>
                </div>
              </div>

              {/* ─── Branding / Style Presets ─── */}
              <div className="card-elevated rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    Custom Branding
                  </h2>
                  {!canCustomizeBioStyle(userPlan) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Pro+
                    </span>
                  )}
                </div>

                {/* Font Selector */}
                <div className={!canCustomizeBioStyle(userPlan) ? "opacity-50 pointer-events-none" : ""}>
                  <h3 className="text-xs text-muted-foreground mb-2">Font</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.map(font => (
                      <button
                        key={font.id}
                        onClick={() => setEditFont(font.id === "system" ? null : font.id)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all ${(editFont || "system") === font.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                          }`}
                      >
                        <span className="text-sm font-medium" style={{ fontFamily: font.family }}>{font.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Border Radius */}
                <div className={!canCustomizeBioStyle(userPlan) ? "opacity-50 pointer-events-none" : ""}>
                  <h3 className="text-xs text-muted-foreground mb-2">Card Shape</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {BORDER_RADIUS_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setEditCardRadius(opt.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${editCardRadius === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                          }`}
                      >
                        <div
                          className="w-full h-8 bg-muted/60 border border-border mb-1.5"
                          style={{ borderRadius: opt.value }}
                        />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Opacity */}
                <div className={!canCustomizeBioStyle(userPlan) ? "opacity-50 pointer-events-none" : ""}>
                  <h3 className="text-xs text-muted-foreground mb-2">Card Opacity — {editCardOpacity}%</h3>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={editCardOpacity}
                    onChange={(e) => setEditCardOpacity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Hide Branding Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-foreground">Hide &quot;Powered by ChirplyMint&quot;</h3>
                    <p className="text-[10px] text-muted-foreground">Remove the footer badge on your public page</p>
                  </div>
                  {canHideBranding(userPlan) ? (
                    <button
                      onClick={() => setEditHideBranding(!editHideBranding)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editHideBranding ? "bg-primary" : "bg-muted"
                        }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editHideBranding ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                    </button>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Business
                    </span>
                  )}
                </div>

                {!canCustomizeBioStyle(userPlan) && (
                  <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                    Upgrade to <strong>Pro</strong> to unlock custom fonts, card styles, and more.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── Analytics Tab ─── */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="card-elevated rounded-2xl p-5 text-center">
                  <Globe className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{analytics.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="card-elevated rounded-2xl p-5 text-center">
                  <MousePointerClick className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{analytics.totalClicks}</p>
                  <p className="text-xs text-muted-foreground">Total Clicks</p>
                </div>
              </div>

              <div className="card-elevated rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Link Performance</h3>
                {links.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No links yet</p>
                ) : (
                  <div className="space-y-2">
                    {links.sort((a, b) => b.click_count - a.click_count).map(link => (
                      <div key={link.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                        <span className="text-lg">{link.emoji}</span>
                        <span className="text-sm flex-1 truncate">{link.title}</span>
                        <span className="text-sm font-semibold text-primary">{link.click_count} clicks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Live Preview</p>
            <div
              className={`rounded-3xl overflow-hidden border border-border shadow-xl ${selectedTheme.bg} ${selectedTheme.text}`}
              style={{
                minHeight: 480,
                fontFamily: FONTS.find(f => f.id === (editFont || "system"))?.family,
              }}
            >
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center text-3xl font-bold overflow-hidden"
                  style={{ borderColor: editAccent, backgroundColor: editAccent + "22" }}
                >
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (page.display_name || page.slug).charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold">{page.display_name || page.slug}</h2>
                  {editBio && <p className="text-sm opacity-70 mt-1">{editBio}</p>}
                </div>

                {/* Links preview */}
                <div className="w-full space-y-2.5 mt-2">
                  {links.filter(l => l.is_active).map(link => {
                    const radiusVal = BORDER_RADIUS_OPTIONS.find(r => r.id === editCardRadius)?.value || "12px";
                    return (
                      <div
                        key={link.id}
                        className="w-full py-3 px-4 text-sm font-medium flex items-center gap-2 justify-center transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: editAccent + Math.round(editCardOpacity * 0.26).toString(16).padStart(2, "0"),
                          border: `1.5px solid ${editAccent}55`,
                          borderRadius: radiusVal,
                        }}
                      >
                        <span>{link.emoji}</span>
                        <span>{link.title}</span>
                      </div>
                    );
                  })}
                  {links.filter(l => l.is_active).length === 0 && (
                    <p className="text-xs opacity-50 py-8">Your links will appear here</p>
                  )}
                </div>

                {!editHideBranding && (
                  <p className="text-[10px] opacity-30 mt-6">Powered by ChirplyMint</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
