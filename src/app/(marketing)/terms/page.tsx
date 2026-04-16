import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ChirplyMint",
  description: "Terms and conditions for using ChirplyMint services.",
};

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6 prose prose-neutral prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-sm !text-muted-foreground">Last updated: April 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By using ChirplyMint (&quot;Service&quot;), you agree to these Terms of Service.
        If you do not agree, do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        ChirplyMint provides Instagram DM automation tools that allow business
        account owners to automatically respond to comments with personalized
        direct messages using the official Meta API.
      </p>

      <h2>3. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old</li>
        <li>You must have a valid Instagram Business or Creator account</li>
        <li>You must comply with Instagram&apos;s Terms of Service and Community Guidelines</li>
      </ul>

      <h2>4. User Responsibilities</h2>
      <p>You agree to:</p>
      <ul>
        <li>Not use the Service for spam or unsolicited messaging</li>
        <li>Not violate Instagram&apos;s policies or any applicable laws</li>
        <li>Keep your account credentials secure</li>
        <li>Not use the Service to send harmful, misleading, or illegal content</li>
      </ul>

      <h2>5. Billing & Subscriptions</h2>
      <p>
        Free accounts have limited features. Paid plans are billed monthly. You
        can cancel at any time. Refunds are handled on a case-by-case basis.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        You retain ownership of your content. You grant ChirplyMint a limited
        license to process your content solely for providing the Service.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        ChirplyMint is provided &quot;as is&quot; without warranties. We are not liable
        for any damages arising from the use or inability to use the Service,
        including but not limited to Instagram account restrictions resulting
        from your use of the Service.
      </p>

      <h2>8. Termination</h2>
      <p>
        We may suspend or terminate your account if you violate these terms. You
        may delete your account at any time.
      </p>

      <h2>9. Changes to Terms</h2>
      <p>
        We may update these terms. Continued use constitutes acceptance of the
        updated terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions? Contact us at <strong>legal@novamintnetworks.in</strong>
      </p>
    </article>
  );
}
