"use client";

import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { InstagramIcon, XIcon } from "./brand-icons";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/motion/reveal";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How It Works", href: "/#demo" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Help Center", href: "/help" },
      { label: "Contact", href: "/contact" },
      { label: "System Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
      { label: "Data Policy", href: "/data-policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-mint/10 blur-[130px]" />
      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-8">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
                <Image src="/logo.png" alt="ChirplyMint" width={36} height={36} className="w-9 h-9 rounded-xl transition-transform duration-300 group-hover:rotate-6" />
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Chirply<span className="text-gradient">Mint</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Turn every Instagram comment into a customer with AI-powered DM automation.
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <a
                  href="https://instagram.com/chirplymint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-white hover:border-transparent hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7]"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                </a>
                <a
                  href="https://twitter.com/chirplymint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-white hover:border-transparent hover:bg-black dark:hover:bg-white dark:hover:text-black"
                  aria-label="Twitter / X"
                >
                  <XIcon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                </a>
                <Link
                  href="/status"
                  className="ml-1 inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-mint/30 transition-colors"
                >
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  All systems live
                </Link>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                100% Meta Approved API
              </div>
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-xs uppercase tracking-[0.12em] text-muted-foreground mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 text-mint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Preferences */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.12em] text-muted-foreground mb-4">Settings</h4>
              <button
                onClick={() => {
                  document.cookie = "cookie_consent=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                  window.location.reload();
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cookie Preferences
              </button>
            </div>
          </div>
        </Reveal>

        {/* Bottom bar */}
        <div className="pt-7 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ChirplyMint by NovaMint Networks. All rights reserved.</p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            Made with <span className="inline-block animate-twinkle">💚</span> in India
          </p>
        </div>
      </div>
    </footer>
  );
}
