import { notFound } from "next/navigation";
import SettingsPage from "@/components/dashboard/settings/settings-page";

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
  return <SettingsPage section={section as (typeof SECTIONS)[number]} />;
}
