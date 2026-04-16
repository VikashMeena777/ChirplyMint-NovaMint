import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  },
  twitter: {
    card: "summary_large_image",
    title: "ChirplyMint — Automate Instagram DMs & Comments",
    description:
      "Turn every Instagram comment into a customer. AI-powered DM automation for creators and businesses.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
