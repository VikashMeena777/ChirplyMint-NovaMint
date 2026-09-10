import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Consistent premium empty state for dashboard lists.
 */
export default function EmptyState({
  icon,
  title,
  copy,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="p-10 md:p-14 text-center">
      <div className="w-16 h-16 rounded-3xl bg-gradient-mint flex items-center justify-center mx-auto mb-5 shadow-lg shadow-mint/25">
        {icon}
      </div>
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">{copy}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="group inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform"
        >
          {actionLabel}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
