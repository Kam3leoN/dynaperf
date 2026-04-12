import type { ReactNode } from "react";
import { getDepartementDisplayLines } from "@/lib/departementDisplay";

/**
 * Bloc UI pour cellule tableau (2 lignes).
 */
export function DepartementTableCell({ raw }: { raw: string | null }): ReactNode {
  const lines = getDepartementDisplayLines(raw);
  if (!lines) return <span className="text-muted-foreground">—</span>;
  if (!lines.line2) {
    return <span className="text-sm text-muted-foreground whitespace-pre-line">{lines.line1}</span>;
  }
  return (
    <div className="text-sm text-muted-foreground leading-tight">
      <div>{lines.line1}</div>
      <div className="text-[11px] opacity-90">{lines.line2}</div>
    </div>
  );
}
