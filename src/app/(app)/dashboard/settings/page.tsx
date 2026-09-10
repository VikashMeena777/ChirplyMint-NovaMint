import { redirect } from "next/navigation";

const LEGACY_TABS = ["account", "instagram", "billing", "notifications", "team"];

/**
 * /dashboard/settings now lives at /dashboard/settings/<section>.
 * This entry keeps old links working (?tab=billing etc.) via a redirect.
 */
export default async function SettingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const section = tab && LEGACY_TABS.includes(tab) ? tab : "account";
  redirect(`/dashboard/settings/${section}`);
}
