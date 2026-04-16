import { Users, Search, Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let leads: Record<string, unknown>[] = [];
  if (user) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    leads = (data as Record<string, unknown>[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            People who engaged with your automations.
          </p>
        </div>
        {leads.length > 0 && (
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-border shadow-sm">
        {leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No leads captured yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Leads are automatically captured when someone interacts with your
              automations. Create your first automation to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Username
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Source
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Keyword
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Captured
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(0.52_0.19_162/15%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center">
                          <span className="text-xs font-bold text-[oklch(0.52_0.19_162)]">
                            {((lead.ig_username as string) || "U")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            @{(lead.ig_username as string) || "unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {(lead.source as string) || "comment"}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded text-foreground">
                        {(lead.trigger_keyword as string) || "—"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(
                        lead.created_at as string
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
