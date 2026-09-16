import { notFound } from "next/navigation";
import SettingsPage from "@/components/dashboard/settings/settings-page";
import { getWorkspaceContext } from "@/lib/workspace";

const SECTIONS = ["account", "instagram", "billing", "notifications", "team"] as const;

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) {
    notFound();
  }
  // Members viewing a team workspace: billing/connections/team manage the
  // OWNER'S or their OWN surfaces — owner-only tabs are hidden and direct
  // URLs show a notice instead of the tab content.
  const ws = await getWorkspaceContext();
  return (
    <SettingsPage
      section={section as (typeof SECTIONS)[number]}
      isMember={ws?.isMember ?? false}
    />
  );
}
