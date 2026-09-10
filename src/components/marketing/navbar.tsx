"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Magnetic from "@/components/motion/magnetic";
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
  const [hovered, setHovered] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
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
      <motion.header
        initial={{ y: -32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6"
      >
        <nav
          className={`max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl px-4 sm:px-5 transition-all duration-300 ${
            isScrolled ? "mt-3 py-2.5 glass shadow-lg shadow-black/5" : "mt-4 py-3 bg-transparent border border-transparent"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="relative">
              <Image src="/logo.png" alt="ChirplyMint" width={36} height={36} className="w-9 h-9 rounded-xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-mint border-2 border-background animate-twinkle" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Chirply<span className="text-gradient">Mint</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHovered(link.label)}
                className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full"
              >
                {hovered === link.label && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-mint/10 border border-mint/20"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Desktop CTA — Auth Aware */}
          <div className="hidden md:flex items-center gap-2.5">
            <ThemeToggle />
            {isLoading ? (
              /* Skeleton while checking auth */
              <div className="w-28 h-10 rounded-xl bg-secondary animate-pulse" />
            ) : user ? (
              /* Logged in — show Dashboard button */
              <Magnetic>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </Magnetic>
            ) : (
              /* Not logged in — show Login + Get Started */
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                >
                  Log in
                </Link>
                <Magnetic>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Magnetic>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2.5 rounded-xl glass"
            aria-label="Toggle menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-20 z-40 md:hidden"
          >
            <div className="glass rounded-2xl p-4 shadow-2xl space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-foreground hover:bg-mint/10 transition-colors"
                  >
                    {link.label}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </motion.div>
              ))}
              <div className="pt-3 mt-2 border-t border-border space-y-2.5">
                <div className="flex items-center justify-between px-4">
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
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-mint text-white font-semibold"
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4" />
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
