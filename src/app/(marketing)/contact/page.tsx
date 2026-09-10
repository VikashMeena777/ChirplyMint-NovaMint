"use client";

import { useState } from "react";
import { Mail, Send, Loader2, MessageCircle, MapPin, Check, Clock } from "lucide-react";
import { submitContactForm } from "@/lib/actions/contact";
import { toast } from "sonner";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";
import Magnetic from "@/components/motion/magnetic";

const channels = [
  { icon: Mail, title: "Email", body: "hello@chirplymint.novamintnetworks.in", note: "Replies within 24 hours" },
  { icon: MessageCircle, title: "Instagram", body: "@chirplymint", note: "DMs open, obviously" },
  { icon: MapPin, title: "Location", body: "India 🇮🇳", note: "Remote-first team" },
];

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
    <div className="pb-24">
      <PageHero
        kicker="Contact"
        title={<>Talk to a <span className="text-gradient">human.</span></>}
        subtitle="Questions, partnerships, press, or just saying hi — we read everything."
      />
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-5 gap-6 items-start">
        {/* Contact Info */}
        <div className="md:col-span-2 space-y-4">
          {channels.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <div className="p-5 rounded-3xl card-elevated card-lift flex items-start gap-4">
                <span className="w-11 h-11 rounded-2xl bg-mint/10 flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5 text-mint" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm">{c.title}</h3>
                  <p className="text-sm text-foreground/90 break-all">{c.body}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.note}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Form */}
        <Reveal delay={0.1} className="md:col-span-3">
          <div className="p-6 md:p-8 rounded-3xl card-elevated shadow-xl">
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center text-center py-14">
                <span className="w-16 h-16 rounded-full bg-gradient-mint flex items-center justify-center mb-5 shadow-lg shadow-mint/30 icon-pop">
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </span>
                <h3 className="text-2xl font-bold mb-2">Message sent!</h3>
                <p className="text-sm text-muted-foreground">We&apos;ll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Name</label>
                    <input
                      name="name"
                      type="text"
                      placeholder="Your name"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 focus:border-mint/50 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Email</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 focus:border-mint/50 transition"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Subject</label>
                  <input
                    name="subject"
                    type="text"
                    placeholder="How can we help?"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-mint/50 focus:border-mint/50 transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Message</label>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="Tell us more…"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-mint/50 focus:border-mint/50 transition"
                    required
                  />
                </div>
                <Magnetic strength={0.08}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-13 py-3.5 flex items-center justify-center gap-2 rounded-xl bg-gradient-mint text-white font-semibold btn-shine glow-mint-sm disabled:opacity-60 hover:scale-[1.01] transition-transform"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 icon-send-fly" />
                        Send Message
                      </>
                    )}
                  </button>
                </Magnetic>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
