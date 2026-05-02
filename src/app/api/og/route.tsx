import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic OG Image Generator
 * URL: /api/og?title=Your+Title&subtitle=Your+Subtitle
 *
 * Generates a 1200x630 social sharing image with ChirplyMint branding.
 * Used for Twitter/X, Facebook, LinkedIn, Discord, etc.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title =
    searchParams.get("title") || "Automate Instagram DMs & Comments";
  const subtitle =
    searchParams.get("subtitle") ||
    "Turn every comment into a customer with AI-powered DM automation";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a14 0%, #0d1117 40%, #0f1923 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-120px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 80px",
            maxWidth: "1100px",
            textAlign: "center",
          }}
        >
          {/* Logo / Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              ⚡
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              ChirplyMint
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              margin: 0,
              marginBottom: "20px",
              maxWidth: "900px",
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "700px",
            }}
          >
            {subtitle}
          </p>

          {/* Domain pill */}
          <div
            style={{
              marginTop: "40px",
              padding: "8px 24px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.25)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              chirplymint.novamintnetworks.in
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
