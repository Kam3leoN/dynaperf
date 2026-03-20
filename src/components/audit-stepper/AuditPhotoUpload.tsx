import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faCamera, faXmark, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  photos: File[];
  onChange: (photos: File[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  uploading: boolean;
}

export function AuditPhotoUpload({ photos, onChange, onSubmit, onBack, uploading }: Props) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    onChange([...photos, ...images]);
  }, [photos, onChange]);

  const removePhoto = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Photos de l'audit</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez des photos pour documenter l'audit (optionnel).
        </p>
      </div>

      {/* Drop zone (desktop) or button (mobile) */}
      {!isMobile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <FontAwesomeIcon icon={faCloudArrowUp} className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Glissez-déposez vos photos ici
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ou cliquez pour sélectionner des fichiers
          </p>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 h-14"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
              }
            }}
          >
            <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4" />
            Galerie
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 h-14"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.click();
              }
            }}
          >
            <FontAwesomeIcon icon={faCamera} className="h-4 w-4" />
            Appareil photo
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((file, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                style={{ opacity: isMobile ? 1 : undefined }}
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length} photo{photos.length !== 1 ? "s" : ""} sélectionnée{photos.length !== 1 ? "s" : ""}
      </p>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="gap-1">
          <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
          Retour
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={uploading}
          className="flex-1 gap-2"
        >
          {uploading ? "Enregistrement…" : "Terminer l'audit"}
        </Button>
      </div>
    </div>
  );
}
