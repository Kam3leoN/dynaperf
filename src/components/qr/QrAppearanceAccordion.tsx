import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type QrAppearancePanelId = "contenu" | "cadre" | "motif" | "coins" | "logo" | "stats";

type SectionDef = {
  value: QrAppearancePanelId;
  icon: IconDefinition;
  title: string;
  description: string;
  content: ReactNode;
};

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: IconDefinition;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 items-start gap-3 text-left">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
        aria-hidden
      >
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 space-y-0.5 pr-2">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs font-normal leading-snug text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}

/**
 * Blocs repliables pour l’apparence du QR (cadre, motif, coins, logo), style type assistant.
 */
export function QrAppearanceAccordion({
  sections,
  className,
  defaultOpen,
}: {
  sections: SectionDef[];
  className?: string;
  /** Valeurs ouvertes par défaut (ex. motif + cadre). */
  defaultOpen?: QrAppearancePanelId[];
}) {
  const defaultValue = defaultOpen ?? ["contenu", "cadre"];
  return (
    <Accordion
      type="multiple"
      defaultValue={defaultValue}
      className={cn("w-full rounded-xl border border-border/50 bg-card shadow-sm", className)}
    >
      {sections.map((s) => (
        <AccordionItem key={s.value} value={s.value} className="border-border/40 px-1 last:border-b-0">
          <AccordionTrigger
            className={cn(
              "rounded-lg px-3 py-4 hover:no-underline [&[data-state=open]]:bg-muted/30",
              "[&>svg]:shrink-0 [&>svg]:text-muted-foreground",
            )}
          >
            <SectionHeader icon={s.icon} title={s.title} description={s.description} />
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-5 pt-0 sm:px-4">
            <div className="space-y-4 border-t border-border/30 pt-4">{s.content}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
