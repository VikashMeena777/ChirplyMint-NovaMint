"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
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
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "py-3 nav-scrolled" : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
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
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 p-4 md:hidden"
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
