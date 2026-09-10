import Link from "next/link";
import { Home, Search } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — ChirplyMint",
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_55%_50%_at_50%_45%,black,transparent)]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[320px] bg-mint/15 blur-[120px] rounded-full" />
      <div className="relative text-center max-w-md">
        <div className="text-[7rem] md:text-[9rem] font-bold leading-none text-gradient tracking-tight">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2 -mt-2">
          Lost in the DMs?
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/help"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass text-sm font-semibold hover:border-mint/40 transition-colors"
          >
            <Search className="w-4 h-4" />
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
