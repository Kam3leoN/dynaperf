import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";
import { cn } from "@/lib/utils";
import type { QrStyleConfig } from "@/lib/qrCodeStyle";

/** Grille miniature pour prévisualiser le style des modules (points). */
function DotsMiniPreview({ type }: { type: DotType }) {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground" aria-hidden>
      {cells.map((i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const x = 3 + c * 7;
        const y = 3 + r * 7;
        if (type === "square") return <rect key={i} x={x} y={y} width={5} height={5} fill="currentColor" />;
        if (type === "dots")
          return <circle key={i} cx={x + 2.5} cy={y + 2.5} r={2.2} fill="currentColor" />;
        if (type === "rounded" || type === "extra-rounded") {
          const rad = type === "extra-rounded" ? 2.2 : 1.2;
          return <rect key={i} x={x} y={y} width={5} height={5} rx={rad} fill="currentColor" />;
        }
        if (type === "classy" || type === "classy-rounded") {
          const rad = type === "classy-rounded" ? 1.5 : 0.8;
          return <rect key={i} x={x + 0.2} y={y + 0.2} width={4.6} height={4.6} rx={rad} fill="currentColor" opacity={0.85} />;
        }
        return <rect key={i} x={x} y={y} width={5} height={5} fill="currentColor" />;
      })}
    </svg>
  );
}

function CornerOuterPreview({ type }: { type: CornerSquareType }) {
  const d =
    type === "square"
      ? "M4 4h16v16H4V4zm3 3h10v10H7V7z"
      : type === "dot"
        ? "M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 3.5c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5S7.5 14.5 7.5 12s2-4.5 4.5-4.5z"
        : type === "extra-rounded"
          ? "M6 4h12a4 4 0 014 4v12a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4zm3 3a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3V10a3 3 0 00-3-3H9z"
          : type === "rounded"
            ? "M5 4h14a3 3 0 013 3v14a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3zm2.5 2.5a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2h-9z"
            : type === "dots" || type === "classy" || type === "classy-rounded"
              ? "M5 4h14a3 3 0 013 3v14a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3zm1 1.5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2V8.5a2 2 0 00-2-2H6z"
              : "M4 4h16v16H4V4zm2 2h12v12H6V6z";
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground" aria-hidden>
      <path fill="currentColor" d={d} />
    </svg>
  );
}

function CornerInnerPreview({ type }: { type: CornerDotType }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground" aria-hidden>
      {type === "dot" || type === "rounded" ? (
        <circle cx="12" cy="12" r={type === "rounded" ? 6 : 5} fill="currentColor" />
      ) : type === "square" ? (
        <rect x="7" y="7" width="10" height="10" fill="currentColor" />
      ) : (
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
      )}
    </svg>
  );
}

const DOT_OPTIONS: { value: DotType; label: string }[] = [
  { value: "square", label: "Carrés" },
  { value: "dots", label: "Points" },
  { value: "rounded", label: "Arrondis" },
  { value: "extra-rounded", label: "Très arrondis" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant rond" },
];

const OUTER_OPTIONS: { value: CornerSquareType; label: string }[] = [
  { value: "square", label: "Carré" },
  { value: "dot", label: "Disque" },
  { value: "extra-rounded", label: "Coins ronds" },
  { value: "rounded", label: "Arrondi" },
  { value: "dots", label: "Points" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant rond" },
];

const INNER_OPTIONS: { value: CornerDotType; label: string }[] = [
  { value: "square", label: "Carré" },
  { value: "dot", label: "Point" },
  { value: "rounded", label: "Arrondi" },
  { value: "extra-rounded", label: "Très rond" },
  { value: "dots", label: "Points" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant rond" },
];

function SwatchButton({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 bg-muted/40 transition-all hover:bg-muted",
        selected ? "border-primary ring-2 ring-primary/25 shadow-sm" : "border-border/70",
      )}
    >
      {children}
    </button>
  );
}

export function QrStyleVisualPickers({
  style,
  onChange,
}: {
  style: QrStyleConfig;
  onChange: (next: QrStyleConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modules (données)</p>
        <div className="flex flex-wrap gap-2">
          {DOT_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.dotsType === o.value}
              onClick={() => onChange({ ...style, dotsType: o.value })}
            >
              <DotsMiniPreview type={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coins extérieurs</p>
        <div className="flex flex-wrap gap-2">
          {OUTER_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.cornersSquareType === o.value}
              onClick={() => onChange({ ...style, cornersSquareType: o.value })}
            >
              <CornerOuterPreview type={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centre des coins</p>
        <div className="flex flex-wrap gap-2">
          {INNER_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.cornersDotType === o.value}
              onClick={() => onChange({ ...style, cornersDotType: o.value })}
            >
              <CornerInnerPreview type={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
    </div>
  );
}
