import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Policy — ChirplyMint",
  description:
    "How ChirplyMint handles, retains, and deletes your Instagram and account data.",
};

export default function DataPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Data Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: April 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. What Data We Store
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            ChirplyMint stores the minimum data necessary to provide our
            Instagram DM automation services:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">Account Data:</strong> Your
              name, email address, and authentication tokens (encrypted)
            </li>
            <li>
              <strong className="text-foreground">
                Instagram Account Data:
              </strong>{" "}
              Instagram Business/Creator account ID, username, profile picture
              URL, and page access token (encrypted)
            </li>
            <li>
              <strong className="text-foreground">Automation Rules:</strong>{" "}
              Keywords, message templates, comment reply templates, button
              configurations, postback flow definitions, and AI persona settings
            </li>
            <li>
              <strong className="text-foreground">DM Logs:</strong> Records of
              automated DMs sent (recipient IG user ID, timestamp, message type,
              status) for analytics and debugging
            </li>
            <li>
              <strong className="text-foreground">Lead Data:</strong> Instagram
              user IDs and usernames of users who interacted with your automated
              content, along with any assigned tags
            </li>
            <li>
              <strong className="text-foreground">Activity Logs:</strong>{" "}
              Internal records of account actions (automation created, settings
              changed, etc.) for audit purposes
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. How We Use Your Data
          </h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>To send automated DMs and comment replies on your behalf</li>
            <li>
              To process postback button interactions and execute multi-step
              flows
            </li>
            <li>To verify follower status when follow-check is enabled</li>
            <li>
              To generate AI-powered message content using your custom persona
              settings
            </li>
            <li>
              To display analytics, lead tracking, and performance metrics in
              your dashboard
            </li>
            <li>To detect and prevent abuse of our platform</li>
            <li>
              To communicate important service updates and security
              notifications
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Data Retention
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We retain data for as long as your account is active:
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Data Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Retention Period
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Account information</td>
                  <td className="px-4 py-3">Until account deletion</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Instagram access tokens</td>
                  <td className="px-4 py-3">
                    Until disconnection or account deletion
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Automation rules & templates</td>
                  <td className="px-4 py-3">Until account deletion</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">DM send logs</td>
                  <td className="px-4 py-3">90 days (auto-purged)</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Activity logs</td>
                  <td className="px-4 py-3">90 days (auto-purged)</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Lead data & tags</td>
                  <td className="px-4 py-3">Until account deletion</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Data Security
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We take data security seriously and employ multiple layers of
            protection:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              All data is stored in Supabase (PostgreSQL) with Row-Level
              Security (RLS) policies — you can only access your own data
            </li>
            <li>
              Instagram access tokens and Meta API secrets are encrypted at rest
            </li>
            <li>
              All connections use TLS/HTTPS — data in transit is always encrypted
            </li>
            <li>
              Webhook signatures are verified using your Meta App Secret before
              processing any incoming events
            </li>
            <li>
              We never store Instagram DM content (message bodies) — only
              metadata (status, timestamp, type) is logged
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Third-Party Data Sharing
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We share data only with the following third-party services required
            to operate ChirplyMint:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">Meta (Instagram API):</strong>{" "}
              To send DMs, read comments, and verify followers on your behalf
            </li>
            <li>
              <strong className="text-foreground">
                Supabase (Database & Auth):
              </strong>{" "}
              To store your account data and handle authentication
            </li>
            <li>
              <strong className="text-foreground">NVIDIA NIM (AI):</strong> Your
              custom persona instructions and message context are sent for AI
              generation — no personal data is shared
            </li>
            <li>
              <strong className="text-foreground">Vercel (Hosting):</strong>{" "}
              Serves the application — minimal access logs are retained
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            We do <strong className="text-foreground">not</strong> sell, rent,
            or trade your data to any third party for marketing or advertising
            purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Your Data Rights
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You have the following rights regarding your data:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">Access:</strong> View all data
              associated with your account via the dashboard
            </li>
            <li>
              <strong className="text-foreground">Portability:</strong> Request
              an export of your data in machine-readable format
            </li>
            <li>
              <strong className="text-foreground">Correction:</strong> Update
              your account information at any time through Settings
            </li>
            <li>
              <strong className="text-foreground">Deletion:</strong> Request
              complete deletion of all your data (see Section 7)
            </li>
            <li>
              <strong className="text-foreground">Revocation:</strong>{" "}
              Disconnect your Instagram account at any time — we immediately
              stop all automation and revoke API access
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Data Deletion Process
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You can request data deletion through any of these methods:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>
              <strong className="text-foreground">From Instagram:</strong>{" "}
              Remove ChirplyMint from your Instagram settings → we receive a
              callback and automatically delete all associated data
            </li>
            <li>
              <strong className="text-foreground">From ChirplyMint:</strong>{" "}
              Navigate to Settings → Delete Account → all data is permanently
              removed
            </li>
            <li>
              <strong className="text-foreground">Via Email:</strong> Send a
              deletion request to{" "}
              <strong className="text-foreground">
                privacy@novamintnetworks.in
              </strong>{" "}
              with your registered email address
            </li>
          </ul>
          <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-foreground font-medium mb-2">
              What gets deleted:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All automation rules and postback flow configurations</li>
              <li>All DM send logs and activity history</li>
              <li>All lead data and tags</li>
              <li>Your Instagram account connection and stored tokens</li>
              <li>Your ChirplyMint account profile</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Deletion is permanent and irreversible. A confirmation code is
              provided for tracking purposes.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Meta Platform Compliance
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            ChirplyMint complies with Meta&apos;s Platform Terms, including
            their Data Policy requirements. We implement mandatory callback
            endpoints for app deauthorization and data deletion requests. When
            Meta notifies us that a user has removed ChirplyMint from their
            Instagram settings, we automatically process the deauthorization and
            data cleanup within 24 hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Cookie Policy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            ChirplyMint uses essential cookies for authentication and session
            management. We also use optional analytics cookies (only with your
            consent). You can manage your cookie preferences at any time via the
            &quot;Manage Preferences&quot; link in our website footer. For more
            details, see our{" "}
            <Link href="/privacy" className="text-mint hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. Contact
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about this Data Policy or to exercise your data
            rights:
          </p>
          <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-foreground font-medium">
              NovaMint Networks — Data Protection
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Email:{" "}
              <strong className="text-foreground">
                privacy@novamintnetworks.in
              </strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Website:{" "}
              <Link href="/" className="text-mint hover:underline">
                chirplymint.novamintnetworks.in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
