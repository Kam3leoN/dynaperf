import { cn } from "@/lib/utils";

interface ReportSigner {
  label: string;
  name?: string | null;
  signature?: string | null;
}

interface ReportSignaturesProps {
  signers: ReportSigner[];
  className?: string;
}

export function ReportSignatures({ signers, className }: ReportSignaturesProps) {
  if (!signers.some((signer) => signer.signature)) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
        Signatures
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {signers.map((signer) => (
          <div key={signer.label} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{signer.label}</p>
              <p className="text-sm font-medium text-foreground">{signer.name || "—"}</p>
            </div>

            <div className="rounded-md border border-border bg-background min-h-28 p-3 flex items-center justify-center">
              {signer.signature ? (
                <img
                  src={signer.signature}
                  alt={`Signature ${signer.label.toLowerCase()}`}
                  className="max-h-20 w-auto object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Non signée</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}