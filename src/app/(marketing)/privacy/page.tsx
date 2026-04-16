import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ChirplyMint",
  description: "How ChirplyMint collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6 prose prose-neutral prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm !text-muted-foreground">Last updated: April 2026</p>

      <h2>1. Information We Collect</h2>
      <p>
        When you use ChirplyMint, we collect information you provide directly,
        including your name, email address, and Instagram account details when
        you connect your account.
      </p>
      <ul>
        <li>Account information (name, email)</li>
        <li>Instagram business account data (via official Meta API)</li>
        <li>Automation rules and message templates you create</li>
        <li>Usage analytics (page views, feature usage)</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide and improve ChirplyMint services</li>
        <li>Process and deliver automated DMs on your behalf</li>
        <li>Send you service updates and notifications</li>
        <li>Analyze usage patterns to improve our product</li>
      </ul>

      <h2>3. Instagram Data</h2>
      <p>
        We access your Instagram data exclusively through the official Meta
        Graph API. We only access data necessary for automation features:
        comments on your posts, and the ability to send DMs on your behalf. We
        do not store the content of conversations beyond what&apos;s needed for
        analytics.
      </p>

      <h2>4. Data Security</h2>
      <p>
        We use industry-standard security measures including encryption in
        transit (TLS) and at rest. Your Instagram access tokens are encrypted
        and stored securely.
      </p>

      <h2>5. Data Sharing</h2>
      <p>
        We do not sell your personal information. We may share data with:
      </p>
      <ul>
        <li>Service providers who help us operate (hosting, analytics)</li>
        <li>Legal authorities when required by law</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You can:</p>
      <ul>
        <li>Access your data at any time via your dashboard</li>
        <li>Delete your account and all associated data</li>
        <li>Disconnect your Instagram account</li>
        <li>Export your data</li>
      </ul>

      <h2>7. Contact</h2>
      <p>
        For privacy-related questions, contact us at{" "}
        <strong>privacy@novamintnetworks.in</strong>
      </p>
    </article>
  );
}
