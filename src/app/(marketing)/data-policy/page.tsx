import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Policy — ChirplyMint",
  description: "How ChirplyMint handles Instagram data deletion and user data requests.",
};

export default function DataPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6 prose prose-neutral prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <h1>Data Deletion Policy</h1>
      <p className="text-sm !text-muted-foreground">Last updated: April 2026</p>

      <h2>1. Data We Store</h2>
      <p>When you connect your Instagram account, we store:</p>
      <ul>
        <li>Your Instagram user ID and business account information</li>
        <li>OAuth access tokens (encrypted)</li>
        <li>Automation rules you create</li>
        <li>Aggregate analytics (DM counts, response rates)</li>
      </ul>

      <h2>2. Data Deletion Request</h2>
      <p>
        You can request deletion of all your data at any time by:
      </p>
      <ul>
        <li>Going to <strong>Settings → Account → Delete Account</strong> in your dashboard</li>
        <li>Emailing us at <strong>privacy@novamintnetworks.in</strong></li>
      </ul>
      <p>
        Upon receiving a deletion request, we will remove all your data within
        30 days, including:
      </p>
      <ul>
        <li>Your account profile and credentials</li>
        <li>All connected Instagram account data</li>
        <li>All automation rules and templates</li>
        <li>All analytics data</li>
      </ul>

      <h2>3. Instagram Data Deletion Callback</h2>
      <p>
        As required by Meta Platform Terms, we support Instagram&apos;s data
        deletion callback. When a user removes ChirplyMint from their Instagram
        settings, we automatically receive a callback and delete all data
        associated with that Instagram account.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Active accounts: Data is retained as long as your account is active.
        Deleted accounts: All data is permanently removed within 30 days of
        deletion. Backups containing deleted data are purged within 90 days.
      </p>

      <h2>5. Contact</h2>
      <p>
        For data-related requests, email{" "}
        <strong>privacy@novamintnetworks.in</strong>
      </p>
    </article>
  );
}
