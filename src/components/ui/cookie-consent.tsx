"use client";

import { useEffect, useState } from "react";
import { getCookie, setCookie } from "cookies-next";
import { X, Cookie, Shield } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = getCookie("cookie_consent");
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    setCookie("cookie_consent", "accepted", {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
      sameSite: "lax",
    });
    setShow(false);
  }

  function handleDecline() {
    setCookie("cookie_consent", "declined", {
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  We use cookies
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use cookies to improve your experience and analyze site
                  traffic. By accepting, you agree to our use of analytics
                  cookies.{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  <button
                    onClick={handleAccept}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
