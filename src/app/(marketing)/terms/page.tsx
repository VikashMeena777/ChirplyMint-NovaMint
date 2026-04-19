import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — ChirplyMint",
  description:
    "Terms and conditions for using ChirplyMint Instagram DM automation services.",
};

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: April 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Acceptance of Terms
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using ChirplyMint (&quot;Service&quot;), operated by
            NovaMint Networks (&quot;Company&quot;, &quot;we&quot;,
            &quot;us&quot;), you agree to be bound by these Terms of Service. If
            you do not agree to all terms, you must not use the Service. We
            reserve the right to update these terms at any time, and your
            continued use constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Description of Service
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            ChirplyMint is an Instagram DM automation platform that enables
            business and creator account owners to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              Automatically send Direct Messages when users comment specific
              keywords on their posts or reels
            </li>
            <li>
              Send interactive button templates (URL and Postback) via the
              Instagram Messaging API
            </li>
            <li>
              Build multi-step postback flows for interactive DM funnels
            </li>
            <li>
              Auto-reply to comments with customizable response templates
            </li>
            <li>
              AI-powered DM generation with custom personas using NVIDIA NIM
            </li>
            <li>
              Follower verification — optionally require users to follow your
              account before receiving a DM
            </li>
            <li>
              Track leads, messages, and analytics through the dashboard
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            All features operate through the official Meta (Instagram) API and
            comply with Meta Platform Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Eligibility
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            To use ChirplyMint, you must:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Be at least 18 years of age</li>
            <li>
              Have a valid Instagram Business or Creator account connected to a
              Meta Business Portfolio
            </li>
            <li>
              Have the authority to bind yourself or your organization to these
              terms
            </li>
            <li>
              Comply with Instagram&apos;s Terms of Use, Community Guidelines,
              and Meta Platform Policies
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Account Registration & Security
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You agree to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              Provide accurate and complete information during registration
            </li>
            <li>Keep your login credentials secure and confidential</li>
            <li>
              Notify us immediately at{" "}
              <strong className="text-foreground">
                security@novamintnetworks.in
              </strong>{" "}
              if you suspect unauthorized access
            </li>
            <li>
              Not share your account or grant access to unauthorized third
              parties
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Acceptable Use Policy
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You agree NOT to use ChirplyMint for:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              Spam, unsolicited messaging, or bulk outreach to users who have
              not engaged with your content
            </li>
            <li>
              Sending harmful, misleading, defamatory, or illegal content
            </li>
            <li>
              Impersonating another person or entity in automated messages
            </li>
            <li>
              Violating Instagram&apos;s Terms of Use or Community Guidelines
            </li>
            <li>
              Circumventing Meta API rate limits or restrictions through any
              means
            </li>
            <li>
              Collecting or harvesting user data beyond what is necessary for
              your stated automation purpose
            </li>
            <li>
              Any activity that violates applicable laws, including but not
              limited to anti-spam laws (CAN-SPAM, GDPR)
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Violation of this policy may result in immediate account suspension
            or termination without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Instagram & Meta API Compliance
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            ChirplyMint operates through the official Instagram API with
            Instagram Login. You acknowledge that:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              Instagram imposes a limit of approximately 250 DMs per 24-hour
              period per account — this is a Meta-enforced limit, not ours
            </li>
            <li>
              Meta may change, restrict, or revoke API access at any time, which
              may affect the Service&apos;s functionality
            </li>
            <li>
              You are solely responsible for the content of your automated
              messages and comment replies
            </li>
            <li>
              Any Instagram account restrictions resulting from your use of the
              Service are your responsibility
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Billing & Subscriptions
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            ChirplyMint offers both free and paid subscription plans:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>
              <strong className="text-foreground">Free Plan:</strong> Limited
              features, ideal for testing and small creators
            </li>
            <li>
              <strong className="text-foreground">Paid Plans:</strong> Billed
              monthly or annually via Cashfree payment gateway
            </li>
            <li>
              You may cancel your subscription at any time from Settings. Access
              continues until the end of the current billing cycle
            </li>
            <li>
              No refunds for partial months, except at our sole discretion on a
              case-by-case basis
            </li>
            <li>
              Prices may change with 30 days notice via email to your registered
              address
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Intellectual Property
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain full ownership of all content you create, including
            automation rules, message templates, and custom AI personas. You
            grant ChirplyMint a limited, non-exclusive, revocable license to
            process your content solely for the purpose of providing the
            Service. ChirplyMint&apos;s brand, logo, interface design, and
            proprietary code are owned by NovaMint Networks and may not be used,
            copied, or distributed without express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Data Privacy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Your privacy is important to us. Our collection, use, and protection
            of your data is governed by our{" "}
            <Link href="/privacy" className="text-mint hover:underline">
              Privacy Policy
            </Link>
            . By using the Service, you consent to the data practices described
            therein. You may request deletion of your data at any time per our{" "}
            <Link href="/data-policy" className="text-mint hover:underline">
              Data Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. Limitation of Liability
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            ChirplyMint is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied.
            To the maximum extent permitted by law, NovaMint Networks shall not
            be liable for any indirect, incidental, special, consequential, or
            punitive damages, including but not limited to: lost profits, lost
            data, Instagram account restrictions, missed business opportunities,
            or service interruptions resulting from your use of the Service or
            its unavailability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            11. Termination
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We may suspend or terminate your account if you:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
            <li>Violate these Terms of Service or the Acceptable Use Policy</li>
            <li>
              Engage in activity that could harm other users, ChirplyMint, or
              Meta&apos;s platform
            </li>
            <li>Fail to pay subscription fees when due</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            You may delete your account at any time from the Settings page. Upon
            deletion, all your data will be permanently removed within 30 days
            as described in our Data Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            12. Indemnification
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to indemnify and hold harmless NovaMint Networks from any
            claims, damages, losses, or expenses arising from your use of the
            Service, your violation of these terms, or your violation of any
            third-party rights including Meta&apos;s Platform Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            13. Governing Law
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by the laws of India. Any disputes
            arising from these terms or the Service shall be subject to the
            exclusive jurisdiction of the courts in Bhilwara, Rajasthan, India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            14. Contact
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms of Service, contact us at:
          </p>
          <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-foreground font-medium">
              NovaMint Networks
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Email:{" "}
              <strong className="text-foreground">
                legal@novamintnetworks.in
              </strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Website:{" "}
              <Link
                href="/"
                className="text-mint hover:underline"
              >
                chirplymint.novamintnetworks.in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
