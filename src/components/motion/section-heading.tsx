import type { ReactNode } from "react";
import Reveal from "./reveal";

/**
 * Consistent section header: kicker pill + title + subtitle, centered.
 */
export default function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "center",
}: {
  kicker: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <Reveal className={`max-w-2xl flex flex-col gap-4 mb-14 md:mb-20 ${alignCls}`}>
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-mint/10 border border-mint/20 text-mint-dark dark:text-mint-light text-xs font-bold uppercase tracking-[0.14em]">
        {kicker}
      </span>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground text-balance">{title}</h2>
      {subtitle && <p className="text-base md:text-lg text-muted-foreground leading-relaxed text-balance">{subtitle}</p>}
    </Reveal>
  );
}
