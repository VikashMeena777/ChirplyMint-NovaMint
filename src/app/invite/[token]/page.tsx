"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { acceptTeamInvite } from "@/lib/actions/team";
import Link from "next/link";

function InviteInner() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<"working" | "done" | "error" | "login">( "working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const result = await acceptTeamInvite(params.token);
      if (result.success) {
        setState("done");
        setTimeout(() => router.push("/dashboard"), 2500);
      } else if (result.error?.includes("log in first")) {
        setState("login");
        setMessage(result.error);
      } else {
        setState("error");
        setMessage(result.error || "Something went wrong.");
      }
    })();
  }, [params.token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[oklch(0.52_0.19_162/20%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-[oklch(0.52_0.19_162)]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Team Invitation</h1>

        {state === "working" && (
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking your invite…
          </p>
        )}

        {state === "done" && (
          <div className="space-y-2">
            <p className="flex items-center justify-center gap-2 text-emerald-500 font-medium">
              <CheckCircle2 className="w-5 h-5" /> You&apos;re on the team!
            </p>
            <p className="text-sm text-muted-foreground">Taking you to the dashboard…</p>
          </div>
        )}

        {state === "login" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold"
            >
              <LogIn className="w-4 h-4" /> Go to Login
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-2">
            <p className="flex items-center justify-center gap-2 text-red-400 font-medium">
              <XCircle className="w-5 h-5" /> {message}
            </p>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground underline">
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  );
}
