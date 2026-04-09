import { useState, useRef, useCallback } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faCamera, faXmark, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useShellNarrow } from "@/contexts/ResponsiveShellContext";
import { SignaturePad } from "@/components/ui/signature-pad";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  photos: File[];
  onChange: (photos: File[]) => void;
  existingPhotos: string[];
  onExistingPhotosChange: (photos: string[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  uploading: boolean;
  auditeurName: string;
  partenaireName: string;
  signatureAuditeur: string | null;
  onSignatureAuditeurChange: (v: string | null) => void;
  signatureAudite: string | null;
  onSignatureAuditeChange: (v: string | null) => void;
}

export function AuditPhotoUpload({
  photos, onChange, existingPhotos, onExistingPhotosChange, onSubmit, onBack, uploading,
  auditeurName, partenaireName,
  signatureAuditeur, onSignatureAuditeurChange,
  signatureAudite, onSignatureAuditeChange,
}: Props) {
  const isMobile = useShellNarrow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [existingUrls, setExistingUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for existing photos
  useEffect(() => {
    if (existingPhotos.length === 0) return;
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const path of existingPhotos) {
        const { data } = await supabase.storage
          .from("audit-photos")
          .createSignedUrl(path, 3600);
        if (cancelled) return;
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      setExistingUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [existingPhotos]);

  const removeExistingPhoto = useCallback(async (path: string) => {
    await supabase.storage.from("audit-photos").remove([path]);
    onExistingPhotosChange(existingPhotos.filter((p) => p !== path));
  }, [existingPhotos, onExistingPhotosChange]);

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

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.removeAttribute("capture");
            fileInputRef.current.click();
          }
        }}
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
          {isMobile ? "Appuyez pour sélectionner des photos" : "Glissez-déposez vos photos ici"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ou cliquez pour sélectionner des fichiers
        </p>
      </div>

      {/* Camera button — mobile/tablet only */}
      {isMobile && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 h-12"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute("capture", "environment");
              fileInputRef.current.click();
            }
          }}
        >
          <FontAwesomeIcon icon={faCamera} className="h-4 w-4" />
          Ouvrir l'appareil photo
        </Button>
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

      {/* Existing photos from server */}
      {existingPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Photos enregistrées ({existingPhotos.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {existingPhotos.map((path) => (
              <div key={path} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                {existingUrls[path] ? (
                  <img
                    src={existingUrls[path]}
                    alt="Photo existante"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">Chargement…</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(path)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ opacity: isMobile ? 1 : undefined }}
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {existingPhotos.length + photos.length} photo{(existingPhotos.length + photos.length) !== 1 ? "s" : ""} au total
      </p>

      {/* ── Signatures ── */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground">Signatures</h2>
        <p className="text-sm text-muted-foreground">
          Signatures numériques de l'auditeur et du partenaire audité.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SignaturePad
          label="Signature de l'auditeur"
          signerName={auditeurName}
          value={signatureAuditeur}
          onChange={onSignatureAuditeurChange}
        />
        <SignaturePad
          label="Signature du partenaire audité"
          signerName={partenaireName}
          value={signatureAudite}
          onChange={onSignatureAuditeChange}
        />
      </div>

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
