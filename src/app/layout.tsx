import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"),
  title: "ChirplyMint — Automate Instagram DMs & Comments",
  description:
    "Turn every Instagram comment into a customer. ChirplyMint automates your DMs with AI-powered responses, lead capture, and smart content delivery.",
  keywords: [
    "Instagram automation",
    "DM automation",
    "Instagram marketing",
    "AI chatbot",
    "comment automation",
    "Instagram DM bot",
    "social media automation",
  ],
  openGraph: {
    title: "ChirplyMint — Automate Instagram DMs & Comments",
    description:
      "Turn every Instagram comment into a customer. AI-powered DM automation for creators and businesses.",
    type: "website",
    siteName: "ChirplyMint",
    url: "/",            // resolves to metadataBase — provides og:url
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "ChirplyMint — Automate Instagram DMs & Comments",
      },
    ],
  },
  facebook: {
    // The Instagram Login app's platform id — fixes the Meta Sharing
    // Debugger 'missing fb:app_id' warning and links link-preview
    // analytics to the app.
    appId: process.env.META_APP_ID || undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "ChirplyMint — Automate Instagram DMs & Comments",
    description:
      "Turn every Instagram comment into a customer. AI-powered DM automation for creators and businesses.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrains.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            {children}
            <CookieConsent />
            <Toaster position="bottom-right" richColors />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
