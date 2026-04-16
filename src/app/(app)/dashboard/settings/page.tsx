"use client";

import { useEffect, useState } from "react";
import {
  User,
  Link2,
  CreditCard,
  Bell,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { getProfile, updateProfile } from "@/lib/actions/dashboard";
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

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const data = await getProfile();
    if (data) {
      setProfile(data);
      setName(data.name);
    }
    setLoading(false);
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
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
      <div className="rounded-2xl bg-white border border-border shadow-sm p-6">
        {activeTab === "account" && (
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-md">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
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
        )}

        {activeTab === "instagram" && (
          <div className="space-y-4 max-w-md">
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-3">
                <Link2 className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Connect Instagram
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Link your Instagram Business or Creator account to start
                automating DMs.
              </p>
              <button className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all">
                Connect Account
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Requires a Facebook Page linked to your Instagram account.
              </p>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-6 max-w-lg">
            <div className="rounded-xl border border-[oklch(0.52_0.19_162/30%)] bg-[oklch(0.52_0.19_162/5%)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
                <span className="text-sm font-semibold text-[oklch(0.52_0.19_162)]">
                  {(profile?.plan ?? "free").charAt(0).toUpperCase() +
                    (profile?.plan ?? "free").slice(1)}{" "}
                  Plan
                </span>
              </div>
              <p className="text-sm text-foreground">
                <strong>
                  {profile?.dmCountThisMonth ?? 0} / {profile?.dmLimit ?? 100}
                </strong>{" "}
                DMs used this month
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  plan: "Pro",
                  price: "₹999/mo",
                  features: [
                    "1,000 DMs/month",
                    "3 Automations",
                    "AI Replies",
                    "Priority Support",
                  ],
                },
                {
                  plan: "Business",
                  price: "₹2,499/mo",
                  features: [
                    "Unlimited DMs",
                    "Unlimited Automations",
                    "Advanced AI",
                    "Team Access",
                    "API Access",
                  ],
                },
              ].map((tier) => (
                <div
                  key={tier.plan}
                  className="rounded-xl border border-border p-5 space-y-3"
                >
                  <h4 className="font-semibold text-foreground">{tier.plan}</h4>
                  <p className="text-2xl font-bold text-foreground">
                    {tier.price}
                  </p>
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
                  </ul>
                  <button className="w-full py-2.5 rounded-xl border border-[oklch(0.52_0.19_162)] text-[oklch(0.52_0.19_162)] text-sm font-semibold hover:bg-[oklch(0.52_0.19_162/5%)] transition-colors">
                    Upgrade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4 max-w-md">
            {[
              {
                title: "DM Delivery Alerts",
                desc: "Get notified when DMs fail to send",
                defaultOn: true,
              },
              {
                title: "Weekly Report",
                desc: "Summary of your automation performance",
                defaultOn: true,
              },
              {
                title: "New Lead Alerts",
                desc: "Notify when a new lead is captured",
                defaultOn: false,
              },
              {
                title: "Product Updates",
                desc: "Learn about new features and improvements",
                defaultOn: true,
              },
            ].map((item) => (
              <label
                key={item.title}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={item.defaultOn}
                  className="w-5 h-5 rounded border-border text-[oklch(0.52_0.19_162)] focus:ring-[oklch(0.52_0.19_162)] cursor-pointer"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
