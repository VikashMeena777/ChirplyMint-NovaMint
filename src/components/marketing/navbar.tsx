"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { TextRoll } from "@/components/motion/text-roll";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How it Works", href: "/#demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Help", href: "/help" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Passive + rAF-coalesced: Lenis emits scroll events every frame, so an
    // unthrottled handler ran a layout read on each one and could block the
    // scroll itself. Now at most one read per frame, and React only re-renders
    // when the boolean actually flips.
    let queued = false;
    const handleScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const next = window.scrollY > 20;
        setIsScrolled((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check auth state
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className={`fixed top-0 inset-x-0 z-50 flex justify-center px-4 transition-[padding] duration-500 ${
          isScrolled ? "pt-3" : "pt-5"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-6 w-full transition-[max-width,padding,background-color,border-color,box-shadow] duration-500 ${
            isScrolled
              ? "max-w-4xl rounded-2xl border border-border/70 bg-card/70 px-5 py-2.5 shadow-[0_8px_32px_-12px_oklch(0_0_0/40%)] backdrop-blur-xl"
              : "max-w-6xl bg-transparent px-6 py-2"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="ChirplyMint" width={36} height={36} className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Chirply<span className="text-mint">Mint</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <TextRoll text={link.label} />
                <span className="absolute -bottom-1 left-1/2 h-px w-full -translate-x-1/2 scale-x-0 bg-gradient-to-r from-transparent via-mint to-transparent transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA — Auth Aware */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isLoading ? (
              /* Skeleton while checking auth */
              <div className="w-28 h-10 rounded-xl bg-secondary animate-pulse" />
            ) : user ? (
              /* Logged in — show Dashboard button */
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            ) : (
              /* Not logged in — show Login + Get Started */
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 rounded-lg border border-border bg-card"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 top-20 z-40 p-4 md:hidden"
          >
            <div className="bg-card rounded-2xl p-6 space-y-4 shadow-xl border border-border">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className="block text-lg font-medium py-2 text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                {user ? (
                  /* Logged in — show Dashboard */
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-mint text-white font-semibold"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                ) : (
                  /* Not logged in — show Login + Get Started */
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileOpen(false)}
                      className="block text-center py-3 rounded-xl border border-border font-medium text-foreground"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileOpen(false)}
                      className="block text-center py-3 rounded-xl bg-gradient-mint text-white font-semibold"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
