import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faFont, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/ui/signature-pad";

interface FullscreenSignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  signerName: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function FullscreenSignaturePad({
  open,
  onOpenChange,
  label,
  signerName,
  value,
  onChange,
}: FullscreenSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Size canvas to container
  useEffect(() => {
    if (!open) return;
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      // Redraw existing value
      if (value) {
        const img = new Image();
        img.onload = () => {
          if (!ctx) return;
          // Scale existing signature to fit the new canvas
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = value;
      }
    };
    // Delay to let overlay render
    const t = setTimeout(resize, 50);
    return () => clearTimeout(t);
  }, [open, value]);

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

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
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPoint.current = point;
    setHasDrawn(true);
  }, [isDrawing, getCoords]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;
  }, [isDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  }, []);

  const applyInitials = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    const initials = getInitials(signerName);
    ctx.font = "bold 72px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = "#0E222C";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, w / 2, h / 2 - 20);
    ctx.font = "italic 20px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(signerName, w / 2, h / 2 + 40);
    setHasDrawn(true);
  }, [signerName]);

  const handleConfirm = useCallback(() => {
    if (canvasRef.current) {
      // Export at a standard resolution (460x160) for consistency
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 460;
      exportCanvas.height = 160;
      const ectx = exportCanvas.getContext("2d");
      if (ectx) {
        ectx.drawImage(canvasRef.current, 0, 0, 460, 160);
        onChange(exportCanvas.toDataURL("image/png"));
      }
    }
    onOpenChange(false);
  }, [onChange, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-container">
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5">
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          Annuler
        </Button>
        <span className="text-sm font-semibold text-foreground truncate mx-2">{label}</span>
        <Button type="button" variant="default" size="sm" onClick={handleConfirm} className="gap-1.5">
          <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
          Valider
        </Button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative bg-white">
        {/* Signature line hint */}
        <div className="absolute bottom-16 left-8 right-8 border-b border-dashed border-muted-foreground/20 pointer-events-none" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-muted-foreground/30 pointer-events-none select-none">
          {signerName || "Signez ici"}
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border bg-surface-container">
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
    </div>
  );
}
