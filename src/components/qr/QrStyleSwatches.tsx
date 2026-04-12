import type { QrStyleConfig } from "@/lib/qrCodeStyle";
import type { QrShapeLibraryRow } from "@/lib/qrShapeMarkup";
import { cn } from "@/lib/utils";

function ShapeThumb({ svgMarkup }: { svgMarkup: string }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  return <img src={src} alt="" className="h-8 w-8 object-contain" loading="lazy" draggable={false} />;
}

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

export type QrStylePickerSection = "modules" | "outer" | "inner" | "cover";

const DEFAULT_SECTIONS: QrStylePickerSection[] = ["modules", "outer", "inner"];

export function QrStyleVisualPickers({
  style,
  onChange,
  sections = DEFAULT_SECTIONS,
  dotShapes,
  cornerShapes,
  coverShapes,
}: {
  style: QrStyleConfig;
  onChange: (next: QrStyleConfig) => void;
  sections?: QrStylePickerSection[];
  dotShapes: QrShapeLibraryRow[];
  cornerShapes: QrShapeLibraryRow[];
  coverShapes: QrShapeLibraryRow[];
}) {
  const show = (s: QrStylePickerSection) => sections.includes(s);

  return (
    <div className="space-y-5">
      {show("modules") ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Style de motif (modules)</p>
          <div className="flex flex-wrap gap-2">
            {dotShapes.map((o) => (
              <SwatchButton
                key={o.id}
                label={o.name}
                selected={style.dotShapeId === o.id}
                onClick={() => onChange({ ...style, dotShapeId: o.id })}
              >
                <ShapeThumb svgMarkup={o.svg_markup} />
              </SwatchButton>
            ))}
          </div>
        </div>
      ) : null}
      {show("outer") ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bordure autour des repères</p>
          <div className="flex flex-wrap gap-2">
            {cornerShapes.map((o) => (
              <SwatchButton
                key={o.id}
                label={o.name}
                selected={style.cornerOuterShapeId === o.id}
                onClick={() => onChange({ ...style, cornerOuterShapeId: o.id })}
              >
                <ShapeThumb svgMarkup={o.svg_markup} />
              </SwatchButton>
            ))}
          </div>
        </div>
      ) : null}
      {show("inner") ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centre des repères</p>
          <div className="flex flex-wrap gap-2">
            {dotShapes.map((o) => (
              <SwatchButton
                key={o.id}
                label={o.name}
                selected={style.cornerInnerShapeId === o.id}
                onClick={() => onChange({ ...style, cornerInnerShapeId: o.id })}
              >
                <ShapeThumb svgMarkup={o.svg_markup} />
              </SwatchButton>
            ))}
          </div>
        </div>
      ) : null}
      {show("cover") ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voile / texture (fond non transparent)</p>
          <div className="flex flex-wrap gap-2">
            <SwatchButton
              label="Aucun voile"
              selected={style.coverShapeId === null}
              onClick={() => onChange({ ...style, coverShapeId: null })}
            >
              <span className="text-[10px] font-medium text-muted-foreground">∅</span>
            </SwatchButton>
            {coverShapes.map((o) => (
              <SwatchButton
                key={o.id}
                label={o.name}
                selected={style.coverShapeId === o.id}
                onClick={() => onChange({ ...style, coverShapeId: o.id })}
              >
                <ShapeThumb svgMarkup={o.svg_markup} />
              </SwatchButton>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
