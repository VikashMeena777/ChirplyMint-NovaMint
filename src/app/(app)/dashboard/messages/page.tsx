import { MessageCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let messages: Record<string, unknown>[] = [];
  if (user) {
    const { data } = await supabase
      .from("dm_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50);
    messages = (data as Record<string, unknown>[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recent DM conversations from your automations.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-border shadow-sm">
        {messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No messages yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Messages will appear here once your automations start sending DMs
              to commenters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[oklch(0.52_0.19_162)]">
                    {((msg.recipient_username as string) || "U")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    @{(msg.recipient_username as string) || "unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {(msg.message_text as string) || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      msg.status === "sent"
                        ? "bg-green-50 text-green-700"
                        : msg.status === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.status as string}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.sent_at as string).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
