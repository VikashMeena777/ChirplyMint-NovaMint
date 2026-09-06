// Shared types, interfaces, and constants for the Automations feature

export interface Automation {
  id: string;
  name: string;
  keyword: string;
  dm_template: string;
  post_url: string | null;
  media_id: string | null;
  scope_type: string;
  content_type: string;
  status: string;
  dms_sent: number;
  leads_captured: number;
  ai_enabled: boolean;
  comment_reply_enabled: boolean;
  comment_reply_template: string | null;
  require_follow: boolean;
  template_type: string;
  template_title: string | null;
  template_subtitle: string | null;
  template_image_url: string | null;
  template_buttons: TemplateButton[];
  created_at: string;
}

export interface IGPost {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  permalink: string;
  timestamp: string;
}

export interface TemplateButton {
  type: "web_url" | "postback";
  title: string;
  url?: string;
  payload?: string;
}

export interface PostbackFlowForm {
  payload: string;
  label: string;
  response_type: "text" | "button";
  response_text: string;
  response_template_title: string;
  response_template_subtitle: string;
  response_template_image_url: string;
  response_template_buttons: { type: "web_url"; title: string; url?: string }[];
  lead_tag: string;
}

export interface FormData {
  name: string;
  keyword: string;
  dm_template: string;
  scope_type: "account" | "media";
  content_type: "all" | "reel" | "post";
  media_id: string;
  media_ids: string[];
  post_url: string;
  ai_enabled: boolean;
  ai_persona: string;
  comment_reply_enabled: boolean;
  comment_reply_template: string;
  require_follow: boolean;
  template_type: "text" | "button" | "multi_image" | "pdf";
  template_title: string;
  template_subtitle: string;
  template_image_url: string;
  template_image_urls: string;
  template_file_url: string;
  template_buttons: TemplateButton[];
  trigger_type: "comment_trigger" | "story_reply" | "both";
  instagram_account_id: string;
}

export const INITIAL_FORM_DATA: FormData = {
  name: "",
  keyword: "",
  dm_template: "",
  scope_type: "account",
  content_type: "all",
  media_id: "",
  media_ids: [],
  post_url: "",
  ai_enabled: false,
  ai_persona: "",
  comment_reply_enabled: false,
  comment_reply_template: "",
  require_follow: false,
  template_type: "text",
  template_title: "",
  template_subtitle: "",
  template_image_url: "",
  template_image_urls: "",
  template_file_url: "",
  template_buttons: [],
  trigger_type: "comment_trigger",
  instagram_account_id: "",
};

import {
  Gift,
  Flame,
  CalendarCheck,
  Rocket,
  MessageSquare,
} from "lucide-react";

export const PRESET_TEMPLATES = [
  {
    id: "free_resource",
    name: "🎁 Free Resource",
    icon: Gift,
    color: "emerald",
    title: "Your Free Guide is Ready! 📚",
    subtitle: "Tap below to grab it instantly",
    buttons: [{ type: "web_url" as const, title: "Download Now →", url: "https://example.com" }],
  },
  {
    id: "limited_offer",
    name: "🔥 Limited Offer",
    icon: Flame,
    color: "orange",
    title: "Exclusive Deal for You!",
    subtitle: "Only for our engaged followers",
    buttons: [
      { type: "web_url" as const, title: "Shop Now", url: "https://example.com" },
      { type: "web_url" as const, title: "View Details", url: "https://example.com" },
    ],
  },
  {
    id: "book_call",
    name: "📅 Book a Call",
    icon: CalendarCheck,
    color: "blue",
    title: "Let's Chat, {name}!",
    subtitle: "I'd love to help you with your goals",
    buttons: [
      { type: "web_url" as const, title: "Book Free Call", url: "https://example.com" },
      { type: "web_url" as const, title: "Learn More", url: "https://example.com" },
    ],
  },
  {
    id: "course_launch",
    name: "🚀 Course Launch",
    icon: Rocket,
    color: "purple",
    title: "You're In! 🎉",
    subtitle: "Here's your exclusive early access",
    buttons: [
      { type: "web_url" as const, title: "Start Learning", url: "https://example.com" },
      { type: "web_url" as const, title: "Join Community", url: "https://example.com" },
    ],
  },
  {
    id: "community",
    name: "💬 Community Invite",
    icon: MessageSquare,
    color: "teal",
    title: "Welcome to the Crew!",
    subtitle: "Join our private community",
    buttons: [
      { type: "web_url" as const, title: "Join Now", url: "https://example.com" },
      { type: "web_url" as const, title: "What's Inside?", url: "https://example.com" },
    ],
  },
];
