"use client";

import { useState } from "react";
import { Mail, Send, Loader2, MessageCircle, MapPin, Check } from "lucide-react";
import { submitContactForm } from "@/lib/actions/contact";
import { toast } from "sonner";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await submitContactForm(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      setIsSubmitted(true);
      toast.success("Message sent successfully!");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-16 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-3">Get in Touch</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Have a question, partnership idea, or need help? We&apos;d love to hear
          from you.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Contact Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
              <h3 className="font-semibold text-foreground">Email</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              hello@chirplymint.novamintnetworks.in
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
              <h3 className="font-semibold text-foreground">Social</h3>
            </div>
            <p className="text-sm text-muted-foreground">@chirplymint on Instagram</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
              <h3 className="font-semibold text-foreground">Location</h3>
            </div>
            <p className="text-sm text-muted-foreground">India 🇮🇳</p>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-3">
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-card border border-border shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Message Sent!
              </h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Your name"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <input
                  name="subject"
                  type="text"
                  placeholder="How can we help?"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Tell us more..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white font-semibold disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
