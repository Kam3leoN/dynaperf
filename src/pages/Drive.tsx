import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  faPen, faTrash, faBoxOpen, faStar, faFileVideo, faFileAudio, faBook,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DriveFilePreview } from "@/components/drive/DriveFilePreview";
import { uploadFileToSignedUrl } from "@/utils/driveUpload";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const NEW_DOC_DAYS = 14;


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
  tags: string[];
  is_favorite: boolean;
}

function normalizeDoc(row: Record<string, unknown>): DriveDocument {
  const tags = row.tags;
  return {
    ...(row as unknown as DriveDocument),
    tags: Array.isArray(tags) ? (tags as string[]) : [],
    is_favorite: Boolean(row.is_favorite),
  };
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** ePub, Kindle, etc. */
function isEbookFile(fileName: string, mime: string | null): boolean {
  const e = fileExt(fileName);
  return (
    e === "epub" ||
    e === "mobi" ||
    e === "azw" ||
    e === "azw3" ||
    e === "kf8" ||
    Boolean(mime?.includes("epub") || mime?.includes("mobi"))
  );
}

function fileIcon(mime: string | null, fileName: string) {
  if (isEbookFile(fileName, mime)) return faBook;
  if (!mime) return faFile;
  if (mime.includes("pdf")) return faFilePdf;
  if (mime.includes("image")) return faFileImage;
  if (mime.startsWith("video/")) return faFileVideo;
  if (mime.startsWith("audio/")) return faFileAudio;
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

function canPreview(doc: DriveDocument): boolean {
  if (doc.image_url) return true;
  if (doc.mime_type?.startsWith("image/")) return true;
  return false;
}

function parseTagsInput(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function isNewDocument(createdAt: string): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_DOC_DAYS * 24 * 60 * 60 * 1000;
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
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DriveDocument | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTagsInput, setUploadTagsInput] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<DriveDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openUploadDialog = useCallback((doc?: DriveDocument, droppedFile?: File) => {
    if (doc) {
      setEditingDoc(doc);
      setUploadTitle(doc.title);
      setUploadDescription(doc.description || "");
      setUploadTagsInput((doc.tags || []).join(", "));
    } else {
      setEditingDoc(null);
      setUploadTitle(droppedFile ? droppedFile.name.replace(/\.[^.]+$/, "") : "");
      setUploadDescription("");
      setUploadTagsInput("");
    }
    setUploadFile(droppedFile ?? null);
    setUploadImage(null);
    setUploadProgress(0);
    setUploadOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("upload") === "1" && isAdmin) {
      openUploadDialog();
    }
  }, [isAdmin, searchParams, openUploadDialog]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: docs }, { data: profs }] = await Promise.all([
      supabase.from("drive_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    const docList = ((docs ?? []) as Record<string, unknown>[]).map(normalizeDoc);
    setDocuments(docList);
    const profileMap: Record<string, string> = {};
    (profs ?? []).forEach((p: { user_id?: string; display_name?: string }) => {
      if (p.user_id && p.display_name) profileMap[p.user_id] = p.display_name;
    });
    setProfiles(profileMap);
    setLoading(false);

    const urlMap: Record<string, string> = {};
    const toSign = docList.filter((d) => canPreview(d));
    await Promise.all(toSign.map(async (doc) => {
      try {
        if (doc.mime_type?.startsWith("image/")) {
          const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
          if (path) {
            const { data } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 3600);
            if (data?.signedUrl) urlMap[doc.id] = data.signedUrl;
          }
        }
        if (doc.image_url && !urlMap[doc.id]) {
          const imgPath = new URL(doc.image_url).pathname.split("/drive-files/")[1];
          if (imgPath) {
            const { data } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(imgPath), 3600);
            if (data?.signedUrl) urlMap[doc.id] = data.signedUrl;
          } else {
            urlMap[doc.id] = doc.image_url;
          }
        }
      } catch { /* ignore */ }
    }));
    setSignedUrls(urlMap);
  };

  useEffect(() => { void fetchAll(); }, []);

  const matchesType = (mime: string | null, fileName: string, filter: string): boolean => {
    switch (filter) {
      case "ebook":
        return isEbookFile(fileName, mime);
      case "image":
        return Boolean(mime?.startsWith("image/"));
      case "pdf":
        return Boolean(mime?.includes("pdf"));
      case "video":
        return Boolean(mime?.startsWith("video/"));
      case "audio":
        return Boolean(mime?.startsWith("audio/"));
      case "doc":
        return Boolean(mime?.includes("word") || mime?.includes("document") || mime?.includes("presentation") || mime?.includes("powerpoint"));
      case "excel":
        return Boolean(mime?.includes("sheet") || mime?.includes("excel") || mime?.includes("csv"));
      default:
        return true;
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => (d.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [documents]);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (favoritesOnly) result = result.filter((d) => d.is_favorite);
    if (typeFilter) result = result.filter((d) => matchesType(d.mime_type, d.file_name, typeFilter));
    if (tagFilter) result = result.filter((d) => (d.tags || []).includes(tagFilter));
    if (search.trim()) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((d) => {
        const haystack = `${d.title} ${d.file_name} ${d.description || ""} ${(d.tags || []).join(" ")}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    return result;
  }, [search, documents, typeFilter, tagFilter, favoritesOnly]);

  const getModifierName = (userId: string | null) => {
    if (!userId) return null;
    return profiles[userId] || null;
  };

  const storageUploadWithProgress = async (
    path: string,
    file: File,
    progressSlice: (p: number) => void
  ) => {
    const { data: signData, error: signErr } = await supabase.storage
      .from("drive-files")
      .createSignedUploadUrl(path);
    if (!signErr && signData?.signedUrl) {
      await uploadFileToSignedUrl(signData.signedUrl, file, progressSlice);
      return;
    }
    progressSlice(0);
    const { error: upErr } = await supabase.storage.from("drive-files").upload(path, file);
    if (upErr) throw upErr;
    progressSlice(100);
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
    setUploadProgress(0);
    const tags = parseTagsInput(uploadTagsInput);

    try {
      let fileUrl = editingDoc?.file_url || "";
      let fileName = editingDoc?.file_name || "";
      let fileSize = editingDoc?.file_size || 0;
      let mimeType = editingDoc?.mime_type || "";
      let imageUrl = editingDoc?.image_url || null;

      const hasImage = Boolean(uploadImage);
      const weightFile = hasImage ? 0.85 : 1;

      if (uploadFile) {
        const ext = uploadFile.name.split(".").pop();
        const path = `general/${Date.now()}.${ext}`;
        await storageUploadWithProgress(path, uploadFile, (p) => {
          setUploadProgress(Math.round(p * weightFile));
        });
        const { data: urlData } = supabase.storage.from("drive-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
        mimeType = uploadFile.type;
      }

      if (uploadImage) {
        const imgExt = uploadImage.name.split(".").pop();
        const imgPath = `general/img_${Date.now()}.${imgExt}`;
        await storageUploadWithProgress(imgPath, uploadImage, (p) => {
          setUploadProgress(Math.round((uploadFile ? 85 : 0) + p * (uploadFile ? 0.15 : 1)));
        });
        const { data: imgUrlData } = supabase.storage.from("drive-files").getPublicUrl(imgPath);
        imageUrl = imgUrlData.publicUrl;
      }

      if (editingDoc) {
        const { error } = await supabase.from("drive_documents").update({
          title: uploadTitle.trim() || fileName,
          description: uploadDescription.trim() || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          image_url: imageUrl,
          tags,
          updated_by: user?.id ?? null,
        }).eq("id", editingDoc.id);
        if (error) throw error;
        toast.success("Document modifié !");
      } else {
        const { error } = await supabase.from("drive_documents").insert({
          title: uploadTitle.trim() || fileName,
          description: uploadDescription.trim() || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          image_url: imageUrl,
          tags,
          is_favorite: false,
          uploaded_by: user?.id,
          updated_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("Document ajouté !");
      }
      setUploadOpen(false);
      void fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur d'upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
      } catch { /* ignore */ }
    }
    await supabase.from("drive_documents").delete().eq("id", deleteTarget.id);
    toast.success("Document supprimé");
    setDeleteTarget(null);
    void fetchAll();
  };

  const toggleFavorite = async (doc: DriveDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const { error } = await (supabase as any).from("drive_documents").update({ is_favorite: !doc.is_favorite }).eq("id", doc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(doc.is_favorite ? "Retiré des favoris" : "Ajouté aux favoris");
    void fetchAll();
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

  const mimeColor = (mime: string | null, fileName: string) => {
    if (isEbookFile(fileName, mime)) return "bg-teal-100 text-teal-800 dark:bg-teal-900/35 dark:text-teal-300";
    if (!mime) return "bg-muted text-muted-foreground";
    if (mime.includes("pdf")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (mime.startsWith("image/")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (mime.startsWith("video/")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    if (mime.startsWith("audio/")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    if (mime.includes("word") || mime.includes("document")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    if (mime.includes("sheet") || mime.includes("excel")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    return "bg-muted text-muted-foreground";
  };

  const mimeLabel = (mime: string | null, fileName: string) => {
    if (isEbookFile(fileName, mime)) {
      const e = fileExt(fileName);
      if (e === "epub") return "ePub";
      if (e === "mobi" || e === "azw" || e === "azw3") return "Kindle";
      return "eBook";
    }
    if (!mime) return "Fichier";
    if (mime.includes("pdf")) return "PDF";
    if (mime.startsWith("image/")) return "Image";
    if (mime.startsWith("video/")) return "Vidéo";
    if (mime.startsWith("audio/")) return "Audio";
    if (mime.includes("word") || mime.includes("document")) return "DOC";
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "Excel";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
    return "Fichier";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin || !e.dataTransfer.types.includes("Files")) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdmin && e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (!isAdmin) return;
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const f = files[0];
    openUploadDialog(undefined, f);
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
      <div
        className="relative space-y-4 min-h-[calc(100vh-8rem)]"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragActive && isAdmin && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px] pointer-events-none"
            aria-hidden
          >
            <p className="text-lg font-semibold text-primary drop-shadow-sm px-4 text-center">
              Déposez le fichier ici pour l’ajouter au Drive
            </p>
          </div>
        )}

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

        <div className="relative w-full">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (titre, fichier, description, tags…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10 h-12 text-base rounded-xl"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: null, label: "Tout", icon: faBoxOpen },
            { key: "fav", label: "Favoris", icon: faStar },
            { key: "image", label: "Images", icon: faFileImage },
            { key: "pdf", label: "PDF", icon: faFilePdf },
            { key: "ebook", label: "Ebooks", icon: faBook },
            { key: "doc", label: "Documents", icon: faFileWord },
            { key: "excel", label: "Excel", icon: faFileExcel },
            { key: "video", label: "Vidéos", icon: faFileVideo },
            { key: "audio", label: "Audio", icon: faFileAudio },
          ].map((f) => {
            const isFav = f.key === "fav";
            const active = isFav ? favoritesOnly : typeFilter === f.key && !favoritesOnly;
            return (
              <button
                key={f.key ?? "all"}
                type="button"
                onClick={() => {
                  if (isFav) {
                    setFavoritesOnly((v) => !v);
                    setTypeFilter(null);
                  } else {
                    setFavoritesOnly(false);
                    setTypeFilter(f.key);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                <FontAwesomeIcon icon={f.icon} className="h-3 w-3" />
                {f.label}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredDocs.length} fichier{filteredDocs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Tags :</span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`text-xs px-2.5 py-1 rounded-full border ${tagFilter === null ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            >
              Tous
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  tagFilter === t ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map((doc) => {
              const thumbUrl = signedUrls[doc.id] || null;
              const isNew = isNewDocument(doc.created_at);
              return (
                <motion.div key={doc.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card
                    className="group cursor-pointer transition-all hover:shadow-hover hover:-translate-y-0.5 overflow-hidden relative mb-4"
                    onClick={() => openPreview(doc)}
                  >
                    <CardContent className="p-0">
                      {isNew && (
                        <div className="absolute top-0 right-0 z-20 w-20 h-20 overflow-hidden pointer-events-none">
                          <div
                            className="absolute top-4 -right-9 w-36 py-1 text-center text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shadow-md"
                            style={{ transform: "rotate(45deg)" }}
                            aria-label="Nouveau"
                          >
                            Nouveau
                          </div>
                        </div>
                      )}

                      {thumbUrl ? (
                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                          <img
                            src={thumbUrl}
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
                          <FontAwesomeIcon icon={fileIcon(doc.mime_type, doc.file_name)} className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mimeColor(doc.mime_type, doc.file_name)}`}>
                          {mimeLabel(doc.mime_type, doc.file_name)}
                        </span>
                      </div>

                      <div className="p-3 space-y-1">
                        <p className="text-sm font-semibold text-center leading-tight line-clamp-2 pr-6">{doc.title}</p>
                        {doc.description && <p className="text-xs text-muted-foreground text-center line-clamp-2">{doc.description}</p>}
                        {doc.file_size ? <p className="text-[10px] text-muted-foreground text-center">{formatSize(doc.file_size)}</p> : null}
                        <MetaInfo doc={doc} />
                      </div>

                      <div className="absolute top-1.5 right-1.5 z-30 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isAdmin && (
                          <button
                            type="button"
                            className={`h-7 w-7 rounded-full bg-card/90 flex items-center justify-center shadow-sm ${doc.is_favorite ? "text-amber-500" : "hover:bg-primary/10"}`}
                            title={doc.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            onClick={(e) => void toggleFavorite(doc, e)}
                          >
                            <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-primary/10 shadow-sm" title="Télécharger" onClick={(e) => { e.stopPropagation(); void downloadDoc(doc); }}>
                          <FontAwesomeIcon icon={faDownload} className="h-3 w-3 text-primary" />
                        </button>
                        {isAdmin && (
                          <>
                            <button type="button" className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-accent shadow-sm" title="Modifier" onClick={(e) => { e.stopPropagation(); openUploadDialog(doc); }}>
                              <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                            <button type="button" className="h-7 w-7 rounded-full bg-card/90 flex items-center justify-center hover:bg-destructive/20 shadow-sm" title="Supprimer" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: doc.id, name: doc.title }); }}>
                              <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FontAwesomeIcon icon={faBoxOpen} className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {search.trim() || tagFilter || favoritesOnly || typeFilter ? "Aucun fichier trouvé" : "Aucun fichier. Commencez par en uploader un."}
            </p>
          </div>
        )}
      </div>

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
              <Label className="text-xs">Tags (séparés par virgule)</Label>
              <Input
                value={uploadTagsInput}
                onChange={(e) => setUploadTagsInput(e.target.value)}
                placeholder="ex. compta, 2025, urgent"
              />
            </div>
            <div>
              <Label className="text-xs">
                {editingDoc ? "Remplacer le fichier (optionnel)" : "Fichier"} — max {formatSize(MAX_FILE_SIZE)}
                <span className="block font-normal text-muted-foreground mt-0.5">
                  Ebooks : .epub (aperçu intégré), .mobi / .azw / .azw3 (téléchargement) ; les PDF restent gérés comme documents.
                </span>
              </Label>
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
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={() => void handleUpload()} disabled={(!editingDoc && !uploadFile) || uploading}>
              {uploading ? "Envoi…" : editingDoc ? "Enregistrer" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) { setPreviewDoc(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {previewUrl && previewDoc && (
              <DriveFilePreview previewUrl={previewUrl} doc={previewDoc} />
            )}
            {previewDoc && (
              <Button variant="outline" className="gap-2" onClick={() => void downloadDoc(previewDoc)}>
                <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                Télécharger
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
