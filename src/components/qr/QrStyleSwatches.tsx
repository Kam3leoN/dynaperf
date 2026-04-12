import { publicAssetUrl } from "@/lib/basePath";
import { cn } from "@/lib/utils";
import {
  QR_CORNER_OUTER_MODULE_IDS,
  QR_DOT_MODULE_IDS,
  type QrCornerOuterModuleId,
  type QrDotModuleId,
  type QrStyleConfig,
} from "@/lib/qrCodeStyle";

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
function CornerOuterThumb({ id }: { id: QrCornerOuterModuleId }) {
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

const DOT_MODULE_OPTIONS: { value: QrDotModuleId; label: string }[] = QR_DOT_MODULE_IDS.map((id) => ({
  value: id,
  label: `Module ${id}`,
}));

const OUTER_MODULE_OPTIONS: { value: QrCornerOuterModuleId; label: string }[] =
  QR_CORNER_OUTER_MODULE_IDS.map((id) => ({
    value: id,
    label: `Repère ${id}`,
  }));

const INNER_MODULE_OPTIONS: { value: QrDotModuleId; label: string }[] = QR_DOT_MODULE_IDS.map((id) => ({
  value: id,
  label: `Centre ${id}`,
}));

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
          {OUTER_MODULE_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.cornerOuterModuleId === o.value}
              onClick={() => onChange({ ...style, cornerOuterModuleId: o.value })}
            >
              <CornerOuterThumb id={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centre des coins</p>
        <div className="flex flex-wrap gap-2">
          {INNER_MODULE_OPTIONS.map((o) => (
            <SwatchButton
              key={o.value}
              label={o.label}
              selected={style.cornerInnerModuleId === o.value}
              onClick={() => onChange({ ...style, cornerInnerModuleId: o.value })}
            >
              <DotShapeThumb id={o.value} />
            </SwatchButton>
          ))}
        </div>
      </div>
    </div>
  );
}
