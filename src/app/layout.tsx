import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "ChirplyMint — Automate Instagram DMs & Comments",
      },
    ],
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
