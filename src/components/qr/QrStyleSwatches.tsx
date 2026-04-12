import type { CornerDotType, CornerSquareType } from "qr-code-styling";
import { publicAssetUrl } from "@/lib/basePath";
import { QR_CORNER_OUTER_ASSET_ID } from "@/lib/qrShapeAssetIds";
import { cn } from "@/lib/utils";
import { QR_DOT_MODULE_IDS, type QrDotModuleId, type QrStyleConfig } from "@/lib/qrCodeStyle";

/** Miniature alignée sur `public/qrcode/dots/<id>.svg` (même rendu que l’aperçu QR). */
function DotShapeThumb({ id }: { id: QrDotModuleId }) {
  return (
    <img
      src={publicAssetUrl(`qrcode/dots/${id}.svg`)}
      alt=""
      className="h-8 w-8 object-contain"
      loading="lazy"
      draggable={false}
    />
  );
}

/** Miniature alignée sur `public/qrcode/corners/<id>.svg`. */
function CornerOuterThumb({ type }: { type: CornerSquareType }) {
  const id = QR_CORNER_OUTER_ASSET_ID[type];
  return (
    <img
      src={publicAssetUrl(`qrcode/corners/${id}.svg`)}
      alt=""
      className="h-8 w-8 object-contain"
      loading="lazy"
      draggable={false}
    />
  );
}

function CornerInnerThumb({ type }: { type: CornerDotType }) {
  if (type === "dot") {
    return (
      <img
        src={publicAssetUrl("qrcode/corners/inner-dot.svg")}
        alt=""
        className="h-8 w-8 object-contain"
        loading="lazy"
        draggable={false}
      />
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground" aria-hidden>
      {type === "rounded" ? (
        <circle cx="12" cy="12" r={6} fill="currentColor" />
      ) : type === "square" ? (
        <rect x="7" y="7" width="10" height="10" fill="currentColor" />
      ) : (
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
      )}
    </svg>
  );
}

const DOT_MODULE_OPTIONS: { value: QrDotModuleId; label: string }[] = QR_DOT_MODULE_IDS.map((id) => ({
  value: id,
  label: `Module ${id}`,
}));

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
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors hover:bg-muted/40",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
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
          {DOT_MODULE_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.dotModuleId === o.value}
              onClick={() => onChange({ ...style, dotModuleId: o.value })}
            >
              <DotShapeThumb id={o.value} />
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
              <CornerOuterThumb type={o.value} />
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
              <CornerInnerThumb type={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
    </div>
  );
}
