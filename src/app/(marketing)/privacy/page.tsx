import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — ChirplyMint",
  description: "How ChirplyMint collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: September 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Information We Collect
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            When you use ChirplyMint, we collect information you provide directly,
            including your name, email address, and Instagram account details when
            you connect your account.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Account information (name, email)</li>
            <li>Instagram business account data (via official Meta API)</li>
            <li>Automation rules and message templates you create</li>
            <li>Usage analytics (page views, feature usage) — consent-based only</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. How We Use Your Information
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">We use your information to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Provide and improve ChirplyMint services</li>
            <li>Process and deliver automated DMs on your behalf</li>
            <li>Send you service updates, weekly reports, and billing notifications</li>
            <li>Analyze usage patterns to improve our product (with consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Cookies &amp; Tracking
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We use the following types of cookies:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">Essential cookies</strong> — for
              authentication, session management, and security. These cannot be
              disabled.
            </li>
            <li>
              <strong className="text-foreground">Analytics cookies</strong> — we use
              PostHog for anonymized usage analytics. These are{" "}
              <strong className="text-foreground">only activated after you give explicit consent</strong>{" "}
              via our cookie banner.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            You can update your cookie preferences at any time by clicking
            &quot;Manage Preferences&quot; in the site footer, or by clearing your
            browser cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Instagram Data
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We access your Instagram data exclusively through the official Meta
            Graph API. We only access data necessary for automation features:
            comments on your posts, and the ability to send DMs on your behalf. We
            do not store the content of conversations beyond what&apos;s needed for
            analytics.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Google Account Data (Sign in with Google)
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            ChirplyMint offers &quot;Sign in with Google.&quot; If you use it,
            we request only two Google scopes:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">.../auth/userinfo.email</strong> — your
              primary Google Account email address
            </li>
            <li>
              <strong className="text-foreground">.../auth/userinfo.profile</strong> — your
              public profile information (name, profile picture)
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            This data is used <strong className="text-foreground">solely</strong> to
            create and authenticate your ChirplyMint account and display your
            name/avatar in the dashboard. It is stored in our Supabase
            database, is never sold or shared with any third party beyond the
          providers listed in section 7, and is never used for advertising.
            You can delete it at any time by deleting your account
            (section 10), which removes all Google-sourced data within 30
            days. You can also revoke ChirplyMint&apos;s access at any time in
            your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account permissions
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Third-Party Services
          </h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li><strong className="text-foreground">Meta/Instagram</strong> — DM automation via official APIs</li>
            <li><strong className="text-foreground">Supabase</strong> — database and authentication</li>
            <li><strong className="text-foreground">Groq &amp; NVIDIA (AI providers)</strong> — generate AI replies; your persona settings and message context are sent for generation, never for training, with automatic failover between providers</li>
            <li><strong className="text-foreground">Cashfree</strong> — payment processing (INR)</li>
            <li><strong className="text-foreground">Resend</strong> — transactional emails</li>
            <li><strong className="text-foreground">PostHog</strong> — analytics (consent-based only)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Data Security
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We use industry-standard security measures including encryption in
            transit (TLS) and at rest, row-level security on all database tables,
            and secure OAuth flows. Your Instagram access tokens are encrypted
            and stored securely. We never store your Instagram password.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Data Sharing
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Service providers who help us operate (hosting, analytics, payments)</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Your Rights
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">You can:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Access your data at any time via your dashboard</li>
            <li>Delete your account and all associated data from Settings</li>
            <li>Disconnect your Instagram account</li>
            <li>Withdraw consent for analytics cookies at any time</li>
            <li>Opt out of marketing emails</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. Data Retention &amp; Deletion
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Your data is retained for as long as your ChirplyMint account is
            active, because it is required to operate the service you signed
            up for (automations, leads, and analytics are functional data).
            If your account is inactive for 24 continuous months, we may
            delete the account and its data, with notice sent to your email
            address beforehand.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            When you delete your account, all your data — including
            automations, leads, message history, and Google-sourced profile
            information — is permanently removed within 30 days. You can
            also disconnect Instagram or revoke Google access at any time
            without deleting your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Children&apos;s Privacy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            ChirplyMint is a business tool and is not directed at children
            under 16. We do not knowingly collect personal information from
            children under 16. If you believe a child has provided us
            personal information, contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            11. Contact
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions, contact us at{" "}
            <a
              href="mailto:privacy@novamintnetworks.in"
              className="text-primary hover:underline font-medium"
            >
              privacy@novamintnetworks.in
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
