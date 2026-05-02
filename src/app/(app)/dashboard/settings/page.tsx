"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SettingsSkeleton } from "@/components/ui/page-skeleton";
import {
  User,
  Link2,
  CreditCard,
  Bell,
  Loader2,
  Check,
  Sparkles,
  CheckCircle2,
  Unlink,
  AlertTriangle,
  Trash2,
  Clock,
} from "lucide-react";
import { deleteAccount } from "@/lib/actions/account";
import { isUnlimitedDM } from "@/lib/utils/plan-limits";
import { getProfile, updateProfile, getNotificationPreferences, updateNotificationPreferences } from "@/lib/actions/dashboard";
import { toast } from "sonner";

type TabId = "account" | "instagram" | "billing" | "notifications";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  plan: string;
  dmCountThisMonth: number;
  dmLimit: number;
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "instagram", label: "Instagram", icon: Link2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    dm_delivery_alerts: true,
    weekly_report: true,
    new_lead_alerts: false,
    product_updates: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const searchParamsMain = useSearchParams();

  // Verify payment when returning from Cashfree checkout
  const verifyPayment = useCallback(async (orderId: string) => {
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.status === "paid" || data.status === "already_paid") {
        toast.success(`🎉 Plan upgraded to ${data.planName || data.plan}!`);
        loadProfile(); // Reload to show new plan
      } else if (data.status === "not_paid") {
        toast.error("Payment not confirmed yet. Please wait a moment and refresh.");
      }
    } catch {
      console.error("[Payment] Verification failed");
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadNotifPrefs();

    // Auto-verify payment on return from Cashfree
    const paymentStatus = searchParamsMain.get("payment");
    const orderId = searchParamsMain.get("order_id");
    if (paymentStatus === "success" && orderId) {
      setActiveTab("billing");
      verifyPayment(orderId);
    }
  }, [searchParamsMain, verifyPayment]);

  async function loadProfile() {
    setLoading(true);
    const data = await getProfile();
    if (data) {
      setProfile(data);
      setName(data.name);
    }
    setLoading(false);
  }

  async function loadNotifPrefs() {
    const prefs = await getNotificationPreferences();
    if (prefs) setNotifPrefs(prefs);
  }

  async function handleToggleNotif(key: string, checked: boolean) {
    const updated = { ...notifPrefs, [key]: checked };
    setNotifPrefs(updated);
    const result = await updateNotificationPreferences(updated);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Notification preference saved");
    }
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.set("name", name);
    const result = await updateProfile(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated!");
      loadProfile();
    }
    setSaving(false);
  }

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, integrations, and billing.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[oklch(0.52_0.19_162)] text-[oklch(0.52_0.19_162)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        {activeTab === "account" && (
          <>
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-md">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                value={profile?.email ?? ""}
                disabled
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </form>

          {/* Danger Zone: Delete Account */}
          <div className="mt-10 pt-6 border-t border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full h-10 px-3 rounded-lg border border-red-300 dark:border-red-700 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteConfirmText !== "DELETE" || deleting}
                    onClick={async () => {
                      setDeleting(true);
                      await deleteAccount();
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
                  >
                    {deleting ? "Deleting…" : "Permanently Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {activeTab === "instagram" && (
          <InstagramConnectionTab />
        )}

        {activeTab === "billing" && (
          <BillingTab profile={profile} />
        )}

        {activeTab === "notifications" && (
          <div className="space-y-2 max-w-md">
            {[
              {
                key: "dm_delivery_alerts",
                title: "DM Delivery Alerts",
                desc: "Get notified when DMs fail to send",
              },
              {
                key: "weekly_report",
                title: "Weekly Report",
                desc: "Summary of your automation performance",
              },
              {
                key: "new_lead_alerts",
                title: "New Lead Alerts",
                desc: "Notify when a new lead is captured",
              },
              {
                key: "product_updates",
                title: "Product Updates",
                desc: "Learn about new features and improvements",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                {/* Premium toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifPrefs[item.key] ?? false}
                  onClick={() => handleToggleNotif(item.key, !(notifPrefs[item.key] ?? false))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.52_0.19_162)] focus-visible:ring-offset-2 ${
                    notifPrefs[item.key]
                      ? "bg-[oklch(0.52_0.19_162)]"
                      : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                      notifPrefs[item.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Instagram Connection Sub-component ─── */
function InstagramConnectionTab() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<
    {
      id: string;
      ig_user_id: string;
      ig_username: string;
      ig_name: string | null;
      ig_profile_pic: string | null;
      is_active: boolean;
      updated_at: string;
    }[]
  >([]);
  const [limit, setLimit] = useState(1);
  const [canAdd, setCanAdd] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { getIGAccounts } = await import("@/lib/actions/ig-accounts");
    const data = await getIGAccounts();
    setAccounts(data.accounts);
    setLimit(data.limit);
    setCanAdd(data.canAdd);
    setPlan(data.plan);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "instagram_connected") {
      toast.success("Instagram connected successfully!");
      load();
    }
    if (error) {
      const messages: Record<string, string> = {
        instagram_denied: "Instagram authorization was denied.",
        token_exchange_failed: "Failed to exchange token. Try again.",
        no_facebook_page: "No Facebook Page found. Link one to your Instagram first.",
        no_instagram_business: "No Instagram Business account found on that page.",
        save_failed: "Failed to save connection. Try again.",
        oauth_failed: "OAuth error. Please try again.",
        ig_already_linked: "This Instagram account is already connected to another ChirplyMint account. Disconnect it there first.",
        ig_account_limit_reached: "You've reached your plan's Instagram account limit. Upgrade to connect more.",
      };
      toast.error(messages[error] || "Connection failed.");
    }
  }, [searchParams, load]);

  const handleDisconnect = async (accountId: string) => {
    setDisconnectingId(accountId);
    const { disconnectIGAccount } = await import("@/lib/actions/ig-accounts");
    const result = await disconnectIGAccount(accountId);
    if (result.success) {
      toast.success("Instagram account disconnected.");
      load();
    } else {
      toast.error(result.error || "Failed to disconnect.");
    }
    setDisconnectingId(null);
  };

  const handleSetPrimary = async (accountId: string) => {
    setSettingPrimaryId(accountId);
    const { setActiveAccount } = await import("@/lib/actions/ig-accounts");
    const result = await setActiveAccount(accountId);
    if (result.success) {
      toast.success("Primary account updated!");
      load();
    } else {
      toast.error(result.error || "Failed to set primary.");
    }
    setSettingPrimaryId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-lg animate-pulse">
        <div className="rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/50" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted/50" />
              <div className="h-3 w-48 rounded bg-muted/30" />
            </div>
          </div>
          <div className="h-10 w-full rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  const usagePercent = limit > 0 ? Math.round((accounts.length / limit) * 100) : 0;

  return (
    <div className="space-y-5 max-w-lg">
      {/* ── Account Usage Bar ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Connected Accounts
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {accounts.length} / {limit}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usagePercent}%`,
              background:
                usagePercent >= 100
                  ? "oklch(0.55 0.22 25)" // red when full
                  : "linear-gradient(90deg, oklch(0.52 0.19 162), oklch(0.55 0.22 170))",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {plan === "free"
            ? "Free plan · 1 account"
            : plan === "pro"
            ? "Pro plan · up to 3 accounts"
            : "Business plan · up to 10 accounts"}
        </p>
      </div>

      {/* ── Connected Accounts List ── */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((acc, index) => {
            const tokenAgeDays = acc.updated_at
              ? Math.floor(
                  (Date.now() - new Date(acc.updated_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;
            const tokenExpiryWarning = tokenAgeDays >= 50;
            const daysRemaining = Math.max(0, 60 - tokenAgeDays);
            const isDisconnecting = disconnectingId === acc.id;
            const isSettingPrimary = settingPrimaryId === acc.id;
            const isPrimary = index === 0;

            return (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 ${
                  isPrimary
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {acc.ig_profile_pic ? (
                      <img
                        src={acc.ig_profile_pic}
                        alt={acc.ig_username}
                        className={`w-10 h-10 rounded-full object-cover border ${
                          isPrimary ? "border-green-200 dark:border-green-700" : "border-border"
                        }`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPrimary ? "bg-green-100 dark:bg-green-900/40" : "bg-muted/30"
                      }`}>
                        <CheckCircle2 className={`w-5 h-5 ${
                          isPrimary ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        }`} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${
                          isPrimary ? "text-green-800 dark:text-green-300" : "text-foreground"
                        }`}>
                          @{acc.ig_username}
                        </p>
                        {isPrimary && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-green-200 dark:bg-green-800 text-[10px] font-bold text-green-800 dark:text-green-200 uppercase tracking-wider">
                            Primary
                          </span>
                        )}
                      </div>
                      {acc.ig_name && (
                        <p className={`text-xs truncate ${
                          isPrimary ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                        }`}>
                          {acc.ig_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {!isPrimary && accounts.length > 1 && (
                      <button
                        onClick={() => handleSetPrimary(acc.id)}
                        disabled={isSettingPrimary}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
                      >
                        {isSettingPrimary ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      disabled={isDisconnecting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-card text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                      Disconnect
                    </button>
                  </div>
                </div>
                {/* Token expiry warning */}
                {tokenExpiryWarning && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Token expires in {daysRemaining} day
                      {daysRemaining !== 1 ? "s" : ""}
                      {daysRemaining <= 0 &&
                        " — Reconnect to resume automations"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Connect Another / Connect First ── */}
      {canAdd ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-2.5">
            <Link2 className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {accounts.length === 0
              ? "Connect Instagram"
              : "Connect Another Account"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {accounts.length === 0
              ? "Link your Instagram Business or Creator account to start automating DMs."
              : "Add another Instagram account to manage from this dashboard."}
          </p>
          <a
            href="/api/auth/instagram"
            className="mt-3 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Link2 className="w-4 h-4" />
            {accounts.length === 0 ? "Connect Account" : "Add Account"}
          </a>
          <p className="text-xs text-muted-foreground mt-2">
            Requires a Facebook Page linked to your Instagram account.
          </p>
        </div>
      ) : accounts.length > 0 ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Account limit reached
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Upgrade your plan to connect more Instagram accounts.
          </p>
          <a
            href="/dashboard/settings?tab=billing"
            className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade Plan
          </a>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Billing Sub-component ─── */
function BillingTab({ profile }: { profile: UserProfile | null }) {
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const tiers = [
    {
      key: "pro",
      plan: "Pro",
      price: "₹499/mo",
      features: [
        "2,000 DMs/month",
        "10 Automations",
        "5 Drip Steps",
        "AI Smart Replies",
        "A/B Testing",
        "Lead Export (CSV)",
        "Priority Email Support",
      ],
    },
    {
      key: "business",
      plan: "Business",
      price: "₹1,499/mo",
      features: [
        "Unlimited DMs",
        "Unlimited Automations",
        "10 Drip Steps",
        "Advanced AI",
        "Full Analytics & Export",
        "Dedicated Support (WhatsApp)",
      ],
      comingSoon: [
        "Multi IG Account Connect",
        "Team Members",
        "API Access",
        "White-Label",
      ],
    },
  ];

  const currentPlan = profile?.plan ?? "free";

  async function handleUpgrade(planKey: string) {
    setUpgradingPlan(planKey);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        toast.error(data.error || "Failed to create payment order");
        setUpgradingPlan(null);
        return;
      }

      // Load Cashfree JS SDK and open checkout
      const cashfreeEnv = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";

      // Dynamically load Cashfree SDK if not already loaded
      if (!(window as unknown as Record<string, unknown>).Cashfree) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
          document.head.appendChild(script);
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cf = new (window as any).Cashfree({ mode: cashfreeEnv });
      await cf.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (err) {
      console.error("[Billing] Upgrade error:", err);
      toast.error("Something went wrong. Please try again.");
      setUpgradingPlan(null);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-xl border border-[oklch(0.52_0.19_162/30%)] bg-[oklch(0.52_0.19_162/5%)] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
          <span className="text-sm font-semibold text-[oklch(0.52_0.19_162)]">
            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
          </span>
        </div>
        <p className="text-sm text-foreground">
          <strong>
            {profile?.dmCountThisMonth ?? 0} / {isUnlimitedDM(profile?.dmLimit) ? "∞" : (profile?.dmLimit ?? 100)}
          </strong>{" "}
          DMs used this month
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const isCurrentPlan = currentPlan === tier.key;
          const isHigherPlan =
            (currentPlan === "business" && tier.key === "pro");

          return (
            <div
              key={tier.key}
              className="rounded-xl border border-border p-5 space-y-3"
            >
              <h4 className="font-semibold text-foreground">{tier.plan}</h4>
              <p className="text-2xl font-bold text-foreground">{tier.price}</p>
              <ul className="space-y-1.5">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="w-3.5 h-3.5 text-[oklch(0.52_0.19_162)]" />
                    {f}
                  </li>
                ))}
                {(tier as { comingSoon?: string[] }).comingSoon?.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground/60"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-[8px]">⏳</span>
                    {f}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">Soon</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(tier.key)}
                disabled={isCurrentPlan || isHigherPlan || upgradingPlan !== null}
                className="w-full py-2.5 rounded-xl border border-[oklch(0.52_0.19_162)] text-[oklch(0.52_0.19_162)] text-sm font-semibold hover:bg-[oklch(0.52_0.19_162/5%)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {upgradingPlan === tier.key ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : isHigherPlan ? (
                  "Included"
                ) : (
                  "Upgrade"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
