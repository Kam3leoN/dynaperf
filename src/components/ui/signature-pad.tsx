import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faFont, faExpand } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { FullscreenSignaturePad } from "@/components/ui/fullscreen-signature-pad";

interface SignaturePadProps {
  label: string;
  signerName: string;
  value: string | null; // base64 data URL
  onChange: (dataUrl: string | null) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function useCanvasDraw(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onChange: (dataUrl: string | null) => void,
) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [canvasRef]);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPoint.current = getCoords(e);
  }, [getCoords]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const point = getCoords(e);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = "#0E222C";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPoint.current = point;
    setHasDrawn(true);
  }, [isDrawing, getCoords, canvasRef]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }, [isDrawing, onChange, canvasRef]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  }, [onChange, canvasRef]);

  return { startDraw, draw, endDraw, clearCanvas, hasDrawn, setHasDrawn };
}

export { getInitials, useCanvasDraw };

export function SignaturePad({ label, signerName, value, onChange, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const { startDraw, draw, endDraw, clearCanvas, hasDrawn, setHasDrawn } = useCanvasDraw(canvasRef, onChange);

  // Draw existing value on canvas
  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value]);

  const applyInitials = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const initials = getInitials(signerName);
    ctx.font = "bold 48px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = "#0E222C";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "italic 14px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(signerName, canvas.width / 2, canvas.height / 2 + 28);
    setHasDrawn(true);
    onChange(canvas.toDataURL("image/png"));
  }, [signerName, onChange, setHasDrawn]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <span className="text-xs text-muted-foreground">{signerName || "—"}</span>
      </div>

      <div className="relative border border-border rounded-lg overflow-hidden bg-white">
        <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-muted-foreground/30 pointer-events-none" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/40 pointer-events-none select-none">
          Signez ici
        </div>

        <canvas
          ref={canvasRef}
          width={460}
          height={160}
          className="w-full h-[120px] sm:h-[140px] cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setFullscreenOpen(true)}
        >
          <FontAwesomeIcon icon={faExpand} className="h-3 w-3" />
          Plein écran
        </Button>
        {signerName && (
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={applyInitials}>
            <FontAwesomeIcon icon={faFont} className="h-3 w-3" />
            Initiales ({getInitials(signerName)})
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={clearCanvas}
          disabled={!hasDrawn}
        >
          <FontAwesomeIcon icon={faEraser} className="h-3 w-3" />
          Effacer
        </Button>
      </div>

      <FullscreenSignaturePad
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        label={label}
        signerName={signerName}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
