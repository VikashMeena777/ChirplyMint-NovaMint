import {
  Dumbbell,
  ShoppingBag,
  Music,
  GraduationCap,
  Camera,
  Utensils,
  Sparkles,
  BookOpen,
  Briefcase,
  Heart,
  type LucideIcon,
} from "lucide-react";

/**
 * Template gallery — pre-made automation recipes by niche. Each recipe
 * prefills the wizard (keyword, message type, templates, quick replies).
 */

export interface AutomationRecipe {
  id: string;
  niche: string;
  icon: LucideIcon;
  name: string;
  keyword: string;
  commentReply: string;
  blocks: {
    type: string;
    text?: string;
    subtitle?: string;
    file_url?: string;
    image_urls?: string[];
    buttons?: { type: "web_url"; title: string; url: string }[];
    quick_replies?: { title: string; payload: string; content_type?: string }[];
    elements?: { title: string; subtitle?: string; buttons: { type: "web_url"; title: string; url: string }[] }[];
  }[];
}

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "fitness_guide",
    niche: "Fitness Coach",
    icon: Dumbbell,
    name: "Free Workout Plan",
    keyword: "plan, workout, guide",
    commentReply: "Sent {name}! Check your DMs 📩",
    blocks: [
      { type: "text", text: "Hey {name}! 💪 Here's your free workout plan — 4 weeks, no equipment needed." },
      { type: "pdf", file_url: "https://your-cdn.com/workout-plan.pdf" },
      {
        type: "quick_replies",
        text: "Want me to also send my meal prep tips?",
        quick_replies: [
          { title: "Yes please!", payload: "yes_meal", content_type: "text" },
          { title: "Ask Email", payload: "ask_email", content_type: "user_email" },
        ],
      },
    ],
  },
  {
    id: "ecom_catalog",
    niche: "Online Store",
    icon: ShoppingBag,
    name: "Product Catalog + Discount",
    keyword: "shop, catalog, price",
    commentReply: "Catalog sent {name}! 🛍️ Use code DM10",
    blocks: [
      { type: "text", text: "Hi {name}! Here's our latest catalog 👇 Use code DM10 for 10% off your first order!" },
      {
        type: "carousel",
        elements: [
          { title: "Best Seller — ₹499", subtitle: "Our most-loved product", buttons: [{ type: "web_url", title: "Shop Now", url: "https://your-store.com/p/1" }] },
          { title: "New Arrival — ₹799", subtitle: "Just dropped", buttons: [{ type: "web_url", title: "Shop Now", url: "https://your-store.com/p/2" }] },
          { title: "Combo Pack — ₹1,299", subtitle: "Best value", buttons: [{ type: "web_url", title: "Shop Now", url: "https://your-store.com/p/3" }] },
        ],
      },
      { type: "quick_replies", text: "Need help choosing?", quick_replies: [{ title: "Help me pick", payload: "help_pick" }, { title: "Ask Email", payload: "ask_email", content_type: "user_email" }] },
    ],
  },
  {
    id: "music_presave",
    niche: "Musician",
    icon: Music,
    name: "Pre-Save + Exclusive",
    keyword: "song, music, presave",
    commentReply: "{name} you're the best! Presave link in DMs 🎧",
    blocks: [
      { type: "text", text: "{name}!! 🎶 Thank you! Pre-save my new single and you'll get an unreleased bonus track the day it drops." },
      { type: "button_card", text: "Pre-Save Now 🎧", subtitle: "Takes 5 seconds", buttons: [{ type: "web_url", title: "Pre-Save", url: "https://ffm.to/your-link" }] },
      { type: "quick_replies", text: "Want behind-the-scenes clips too?", quick_replies: [{ title: "YES 🔥", payload: "yes_bts" }] },
    ],
  },
  {
    id: "coach_call",
    niche: "Coach",
    icon: GraduationCap,
    name: "Free Strategy Call",
    keyword: "call, coach, help",
    commentReply: "Booking link sent {name}! 📅",
    blocks: [
      { type: "text", text: "Hey {name}! Let's talk about your goals — grab a free 30-min strategy call below. No pitch, just a real conversation." },
      { type: "button_card", text: "Book Your Free Call 📅", subtitle: "Slots fill fast — pick a time", buttons: [{ type: "web_url", title: "Book Now", url: "https://cal.com/you/30min" }] },
      { type: "quick_replies", text: "Want to know what we'll cover?", quick_replies: [{ title: "What's covered?", payload: "whats_covered" }, { title: "Ask Email", payload: "ask_email", content_type: "user_email" }] },
    ],
  },
  {
    id: "photographer_portfolio",
    niche: "Photographer",
    icon: Camera,
    name: "Portfolio + Pricing",
    keyword: "portfolio, price, shoot",
    commentReply: "Sent {name}! 📸",
    blocks: [
      { type: "text", text: "Hi {name}! Here's my latest work + package pricing. Dates for next month are open now." },
      {
        type: "image_album",
        text: "Recent favourites ✨",
        image_urls: ["https://your-cdn.com/work1.jpg", "https://your-cdn.com/work2.jpg", "https://your-cdn.com/work3.jpg"],
      },
      { type: "pdf", file_url: "https://your-cdn.com/pricing.pdf" },
      { type: "quick_replies", text: "Want to lock a date?", quick_replies: [{ title: "Book me in!", payload: "book_date" }, { title: "Ask Email", payload: "ask_email", content_type: "user_email" }] },
    ],
  },
  {
    id: "foodie_recipe",
    niche: "Food Creator",
    icon: Utensils,
    name: "Recipe PDF",
    keyword: "recipe, ingredients",
    commentReply: "Recipe sent {name}! 🍳",
    blocks: [
      { type: "text", text: "{name} here you go — the full recipe with exact measurements 🧑‍🍳" },
      { type: "pdf", file_url: "https://your-cdn.com/recipe.pdf" },
      { type: "quick_replies", text: "Made it? Tell me how it turned out!", quick_replies: [{ title: "It was great!", payload: "made_it" }] },
    ],
  },
  {
    id: "beauty_routine",
    niche: "Beauty / Skincare",
    icon: Sparkles,
    name: "Skincare Routine",
    keyword: "routine, skin, glow",
    commentReply: "Routine sent {name}! ✨",
    blocks: [
      { type: "text", text: "{name} here's the exact routine from my reel — all affordable products, under ₹1,500 total ✨" },
      { type: "pdf", file_url: "https://your-cdn.com/routine.pdf" },
      { type: "button_card", text: "Everything I used", subtitle: "Direct links, no affiliates", buttons: [{ type: "web_url", title: "View Products", url: "https://your-link.com" }] },
    ],
  },
  {
    id: "author_leadmag",
    niche: "Author / Educator",
    icon: BookOpen,
    name: "Free Chapter",
    keyword: "book, chapter, read",
    commentReply: "Chapter on its way {name}! 📚",
    blocks: [
      { type: "text", text: "{name}! Here's Chapter 1 of my book — if it hooks you, the full version is one tap away 📚" },
      { type: "pdf", file_url: "https://your-cdn.com/chapter1.pdf" },
      { type: "button_card", text: "Get the Full Book", subtitle: "Paperback + Kindle available", buttons: [{ type: "web_url", title: "Buy Now", url: "https://amazon.com/your-book" }] },
    ],
  },
  {
    id: "freelancer_portfolio",
    niche: "Freelancer",
    icon: Briefcase,
    name: "Services + Portfolio",
    keyword: "hire, services, work",
    commentReply: "Portfolio sent {name}! 💼",
    blocks: [
      { type: "text", text: "Hi {name}! Here's my portfolio + service packages. I take 2 new clients per month — booking next month now." },
      { type: "pdf", file_url: "https://your-cdn.com/services.pdf" },
      { type: "quick_replies", text: "Want to discuss a project?", quick_replies: [{ title: "Yes, let's talk", payload: "discuss" }, { title: "Ask Email", payload: "ask_email", content_type: "user_email" }] },
    ],
  },
  {
    id: "nonprofit_aid",
    niche: "Community / Cause",
    icon: Heart,
    name: "How to Help",
    keyword: "help, donate, volunteer",
    commentReply: "Thank you {name}! 💚 Details in DMs",
    blocks: [
      { type: "text", text: "{name} thank you for caring 💚 Here's exactly how you can help — every bit counts." },
      { type: "button_card", text: "Ways to Help", subtitle: "Donate, volunteer or share", buttons: [{ type: "web_url", title: "Learn More", url: "https://your-cause.org" }] },
    ],
  },
];

/** Get one recipe by id */
export function getRecipe(id: string): AutomationRecipe | undefined {
  return AUTOMATION_RECIPES.find((r) => r.id === id);
}
