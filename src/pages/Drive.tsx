import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFile, faUpload, faSearch, faDownload,
  faFilePdf, faFileImage, faFileExcel, faFileWord,
  faPen, faTrash, faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface DriveDocument {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  uploaded_by: string | null;
}

function fileIcon(mime: string | null) {
  if (!mime) return faFile;
  if (mime.includes("pdf")) return faFilePdf;
  if (mime.includes("image")) return faFileImage;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return faFileExcel;
  if (mime.includes("word") || mime.includes("document")) return faFileWord;
  return faFile;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatModifiedDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

/** Returns true if mime type can show a visual preview */
function hasVisualPreview(mime: string | null): boolean {
  if (!mime) return false;
  return mime.startsWith("image/") || mime.includes("pdf") || mime.includes("word") || mime.includes("document");
}

/** Check if doc has a potential visual preview */
function canPreview(doc: DriveDocument): boolean {
  if (doc.image_url) return true;
  if (doc.mime_type?.startsWith("image/")) return true;
  return false;
}

export default function Drive() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<DriveDocument[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Upload / Edit doc
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DriveDocument | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Auto-open upload dialog if ?upload=1
  useEffect(() => {
    if (searchParams.get("upload") === "1" && isAdmin) {
      openUploadDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: docs }, { data: profs }] = await Promise.all([
      supabase.from("drive_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    const docList = (docs as DriveDocument[]) ?? [];
    setDocuments(docList);
    const profileMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { if (p.user_id && p.display_name) profileMap[p.user_id] = p.display_name; });
    setProfiles(profileMap);
    setLoading(false);

    // Generate signed URLs for images (bucket is private)
    const urlMap: Record<string, string> = {};
    const toSign = docList.filter((d) => canPreview(d));
    await Promise.all(toSign.map(async (doc) => {
      try {
        // For image files, sign the file itself
        if (doc.mime_type?.startsWith("image/")) {
          const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
          if (path) {
            const { data } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 3600);
            if (data?.signedUrl) urlMap[doc.id] = data.signedUrl;
          }
        }
        // For image_url (custom preview), sign it too if it's from the same bucket
        if (doc.image_url && !urlMap[doc.id]) {
          const imgPath = new URL(doc.image_url).pathname.split("/drive-files/")[1];
          if (imgPath) {
            const { data } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(imgPath), 3600);
            if (data?.signedUrl) urlMap[doc.id] = data.signedUrl;
          } else {
            urlMap[doc.id] = doc.image_url; // external URL
          }
        }
      } catch { /* ignore */ }
    }));
    setSignedUrls(urlMap);
  };

  useEffect(() => { fetchAll(); }, []);

  // Type filter helpers
  const matchesType = (mime: string | null, filter: string): boolean => {
    if (!mime) return false;
    switch (filter) {
      case "image": return mime.startsWith("image/");
      case "pdf": return mime.includes("pdf");
      case "video": return mime.startsWith("video/");
      case "doc": return mime.includes("word") || mime.includes("document") || mime.includes("presentation") || mime.includes("powerpoint");
      case "excel": return mime.includes("sheet") || mime.includes("excel") || mime.includes("csv");
      default: return true;
    }
  };

  // Smart search + type filter
  const filteredDocs = useMemo(() => {
    let result = documents;
    if (typeFilter) {
      result = result.filter((d) => matchesType(d.mime_type, typeFilter));
    }
    if (search.trim()) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((d) => {
        const haystack = `${d.title} ${d.file_name} ${d.description || ""}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    return result;
  }, [search, documents, typeFilter]);

  const getModifierName = (userId: string | null) => {
    if (!userId) return null;
    return profiles[userId] || null;
  };

  // Upload / Edit
  const openUploadDialog = (doc?: DriveDocument) => {
    if (doc) {
      setEditingDoc(doc);
      setUploadTitle(doc.title);
      setUploadDescription(doc.description || "");
    } else {
      setEditingDoc(null);
      setUploadTitle("");
      setUploadDescription("");
    }
    setUploadFile(null);
    setUploadImage(null);
    setUploadOpen(true);
  };

  const handleUpload = async () => {
    if (!editingDoc && !uploadFile) return;

    if (uploadFile && uploadFile.size > MAX_FILE_SIZE) {
      toast.error(`Le fichier ne doit pas dépasser ${formatSize(MAX_FILE_SIZE)}`);
      return;
    }
    if (uploadImage && uploadImage.size > MAX_IMAGE_SIZE) {
      toast.error(`L'image ne doit pas dépasser ${formatSize(MAX_IMAGE_SIZE)}`);
      return;
    }

    setUploading(true);
    try {
      let fileUrl = editingDoc?.file_url || "";
      let fileName = editingDoc?.file_name || "";
      let fileSize = editingDoc?.file_size || 0;
      let mimeType = editingDoc?.mime_type || "";
      let imageUrl = editingDoc?.image_url || null;

      if (uploadFile) {
        const ext = uploadFile.name.split(".").pop();
        const path = `general/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("drive-files").upload(path, uploadFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("drive-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
        mimeType = uploadFile.type;
      }

      if (uploadImage) {
        const imgExt = uploadImage.name.split(".").pop();
        const imgPath = `general/img_${Date.now()}.${imgExt}`;
        const { error: imgErr } = await supabase.storage.from("drive-files").upload(imgPath, uploadImage);
        if (imgErr) throw imgErr;
        const { data: imgUrlData } = supabase.storage.from("drive-files").getPublicUrl(imgPath);
        imageUrl = imgUrlData.publicUrl;
      }

      if (editingDoc) {
        await supabase.from("drive_documents").update({
          title: uploadTitle.trim() || fileName,
          description: uploadDescription.trim() || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          image_url: imageUrl,
          updated_by: user?.id ?? null,
        }).eq("id", editingDoc.id);
        toast.success("Document modifié !");
      } else {
        await supabase.from("drive_documents").insert({
          title: uploadTitle.trim() || fileName,
          description: uploadDescription.trim() || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          image_url: imageUrl,
          uploaded_by: user?.id,
          updated_by: user?.id ?? null,
        });
        toast.success("Document ajouté !");
      }
      setUploadOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc: DriveDocument) => {
    try {
      const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
      if (!path) return;
      const { data, error } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 60, { download: doc.file_name || true });
      if (error || !data?.signedUrl) return;
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.file_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch { /* ignore */ }
  };

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<DriveDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openPreview = async (doc: DriveDocument) => {
    try {
      const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
      if (!path) return;
      const { data } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 3600);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewDoc(doc);
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const doc = documents.find((d) => d.id === deleteTarget.id);
    if (doc) {
      try {
        const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
        if (path) await supabase.storage.from("drive-files").remove([decodeURIComponent(path)]);
      } catch { /* ignore storage cleanup errors */ }
    }
    await supabase.from("drive_documents").delete().eq("id", deleteTarget.id);
    toast.success("Document supprimé");
    setDeleteTarget(null);
    fetchAll();
  };

  const MetaInfo = ({ doc }: { doc: DriveDocument }) => {
    const wasEdited = doc.updated_at !== doc.created_at;
    const date = wasEdited ? doc.updated_at : doc.created_at;
    const userId = wasEdited ? doc.updated_by : doc.uploaded_by;
    const label = wasEdited ? "Modifié" : "Uploadé";
    const name = getModifierName(userId);
    return (
      <p className="text-[10px] text-muted-foreground text-center">
        {label} {formatModifiedDate(date)}
        {name && <> par <span className="font-medium">{name}</span></>}
      </p>
    );
  };

  // File type badge color
  const mimeColor = (mime: string | null) => {
    if (!mime) return "bg-muted text-muted-foreground";
    if (mime.includes("pdf")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (mime.startsWith("image/")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (mime.includes("word") || mime.includes("document")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    if (mime.includes("sheet") || mime.includes("excel")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    return "bg-muted text-muted-foreground";
  };

  const mimeLabel = (mime: string | null) => {
    if (!mime) return "Fichier";
    if (mime.includes("pdf")) return "PDF";
    if (mime.startsWith("image/")) return "Image";
    if (mime.includes("word") || mime.includes("document")) return "DOC";
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "Excel";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
    return "Fichier";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 shrink-0">
            <FontAwesomeIcon icon={faBoxOpen} className="text-primary" />
            Drive
          </h1>
          {isAdmin && (
            <Button size="sm" variant="default" className="gap-1.5 h-10 shrink-0" onClick={() => openUploadDialog()}>
              <FontAwesomeIcon icon={faUpload} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Uploader</span>
            </Button>
          )}
        </div>

        {/* Full-width search bar */}
        <div className="relative w-full">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fichier par nom, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10 h-12 text-base rounded-xl"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: null, label: "Tout", icon: faBoxOpen },
            { key: "image", label: "Images", icon: faFileImage },
            { key: "pdf", label: "PDF", icon: faFilePdf },
            { key: "doc", label: "Documents", icon: faFileWord },
            { key: "excel", label: "Excel", icon: faFileExcel },
            { key: "video", label: "Vidéos", icon: faFile },
          ].map((f) => (
            <button
              key={f.key ?? "all"}
              onClick={() => setTypeFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              <FontAwesomeIcon icon={f.icon} className="h-3 w-3" />
              {f.label}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredDocs.length} fichier{filteredDocs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Documents grid */}
        {filteredDocs.length > 0 ? (
          <div className="grid-content">
            {filteredDocs.map((doc) => {
              const previewUrl = signedUrls[doc.id] || null;
              return (
                <Card
                  key={doc.id}
                  className="group cursor-pointer transition-all hover:shadow-hover hover:-translate-y-0.5 overflow-hidden relative"
                  onClick={() => openPreview(doc)}
                >
                  <CardContent className="p-0">
                    {/* Visual preview area */}
                    {previewUrl ? (
                      <div className="aspect-[4/3] bg-muted overflow-hidden">
                        <img
                          src={previewUrl}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).parentElement!.classList.add("flex", "items-center", "justify-center");
                            const icon = document.createElement("div");
                            icon.innerHTML = `<span class="text-muted-foreground/40 text-4xl">📄</span>`;
                            (e.target as HTMLImageElement).parentElement!.appendChild(icon);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center">
                        <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mimeColor(doc.mime_type)}`}>
                        {mimeLabel(doc.mime_type)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-center leading-tight line-clamp-2">{doc.title}</p>
                      {doc.description && <p className="text-xs text-muted-foreground text-center line-clamp-2">{doc.description}</p>}
                      {doc.file_size ? <p className="text-[10px] text-muted-foreground text-center">{formatSize(doc.file_size)}</p> : null}
                      <ModifiedInfo updatedAt={doc.updated_at} updatedBy={doc.updated_by} />
                    </div>

                    {/* Actions row */}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-primary/10 shadow-sm" title="Télécharger" onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}>
                        <FontAwesomeIcon icon={faDownload} className="h-3 w-3 text-primary" />
                      </button>
                      {isAdmin && (
                        <>
                          <button className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-accent shadow-sm" title="Modifier" onClick={(e) => { e.stopPropagation(); openUploadDialog(doc); }}>
                            <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                          <button className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-destructive/20 shadow-sm" title="Supprimer" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: doc.id, name: doc.title }); }}>
                            <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FontAwesomeIcon icon={faBoxOpen} className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {search.trim() ? "Aucun fichier trouvé" : "Aucun fichier. Commencez par en uploader un."}
            </p>
          </div>
        )}
      </div>

      {/* Upload / Edit document dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Titre</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Titre du document" />
            </div>
            <div>
              <Label className="text-xs">Description (optionnelle)</Label>
              <Input value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Description courte" />
            </div>
            <div>
              <Label className="text-xs">{editingDoc ? "Remplacer le fichier (optionnel)" : "Fichier"} — max {formatSize(MAX_FILE_SIZE)}</Label>
              <Input type="file" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > MAX_FILE_SIZE) {
                  toast.error(`Le fichier ne doit pas dépasser ${formatSize(MAX_FILE_SIZE)}`);
                  return;
                }
                setUploadFile(f ?? null);
              }} />
            </div>
            <div>
              <Label className="text-xs">Image de prévisualisation (optionnelle — max {formatSize(MAX_IMAGE_SIZE)})</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > MAX_IMAGE_SIZE) {
                  toast.error(`L'image ne doit pas dépasser ${formatSize(MAX_IMAGE_SIZE)}`);
                  return;
                }
                setUploadImage(f ?? null);
              }} />
              {(uploadImage || editingDoc?.image_url) && (
                <div className="mt-2">
                  <img
                    src={uploadImage ? URL.createObjectURL(uploadImage) : editingDoc?.image_url || ""}
                    alt="Preview"
                    className="h-20 rounded border border-border object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={(!editingDoc && !uploadFile) || uploading}>
              {uploading ? "Envoi…" : editingDoc ? "Enregistrer" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer le document « {deleteTarget?.name} » ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
