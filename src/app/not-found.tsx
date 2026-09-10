import Link from "next/link";
import { Home, Search } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — ChirplyMint",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          >
            <Search className="w-4 h-4" />
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
