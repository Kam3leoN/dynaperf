import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolder, faFolderOpen, faPlus, faPen, faTrash, faFile, faUpload,
  faSearch, faChevronRight, faArrowLeft, faDownload,
  faFilePdf, faFileImage, faFileExcel, faFileWord,
  faGrip, faList, faImage, faXmark, faArrowsUpDownLeftRight,
  faCompress, faExpand,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auditTypeIcons } from "@/lib/auditTypeVisuals";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
  icon_url: string | null;
}

interface DriveDocument {
  id: string;
  category_id: string;
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

type ViewMode = "cards" | "tree";
type Density = "compact" | "comfortable";

// Map known folder names to audit type SVG icons
const FOLDER_NAME_TO_TYPE: Record<string, string> = {
  "Rencontre Dirigeants Présentiels": "RD Présentiel",
  "Rencontre Dirigeants Distanciels": "RD Distanciel",
  "Clubs d'Affaires": "Club Affaires",
  "Rendez-Vous Commerciaux": "RDV Commercial",
  "Mise en Place": "Mise en Place",
  "Événementiel": "RD Événementiel",
};

function getFolderIcon(cat: { name: string; icon_url: string | null }): string | null {
  if (cat.icon_url) return cat.icon_url;
  const typeKey = FOLDER_NAME_TO_TYPE[cat.name] || cat.name;
  return auditTypeIcons[typeKey]?.icon || null;
}

// ── Tree View Component ──────────────────────────────────────────
interface TreeViewProps {
  categories: Category[];
  documents: DriveDocument[];
  rootParentId: string | null;
  isAdmin: boolean;
  onNavigate: (catId: string) => void;
  onEditCat: (cat: Category) => void;
  onDeleteCat: (cat: Category) => void;
  onDownloadDoc: (doc: DriveDocument) => void;
  onEditDoc: (doc: DriveDocument) => void;
  onDeleteDoc: (doc: DriveDocument) => void;
  onMoveDoc: (docId: string, targetCatId: string) => void;
  getFolderIcon: (cat: { name: string; icon_url: string | null }) => string | null;
  ModifiedInfo: React.FC<{ updatedAt: string; updatedBy: string | null }>;
}

function TreeNode({
  cat, categories, documents, depth, isAdmin,
  onNavigate, onEditCat, onDeleteCat, onDownloadDoc, onEditDoc, onDeleteDoc, onMoveDoc,
  getFolderIcon, ModifiedInfo,
}: TreeViewProps & { cat: Category; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const children = categories.filter((c) => c.parent_id === cat.id);
  const docs = documents.filter((d) => d.category_id === cat.id);
  const iconSrc = getFolderIcon(cat);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors hover:bg-accent/50 group ${dragOver ? "ring-2 ring-primary bg-primary/5" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const docId = e.dataTransfer.getData("text/plain");
          if (docId && isAdmin) onMoveDoc(docId, cat.id);
        }}
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`h-2.5 w-2.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""} ${children.length === 0 && docs.length === 0 ? "invisible" : ""}`}
        />
        {iconSrc ? (
          <img src={iconSrc} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
        ) : (
          <FontAwesomeIcon icon={expanded ? faFolderOpen : faFolder} className="h-4 w-4 text-primary flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground truncate flex-1">{cat.name}</span>
        {(children.length > 0 || docs.length > 0) && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {children.length > 0 && `${children.length} doss.`}
            {children.length > 0 && docs.length > 0 && " · "}
            {docs.length > 0 && `${docs.length} doc.`}
          </Badge>
        )}
        {isAdmin && (
          <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent" onClick={(e) => { e.stopPropagation(); onEditCat(cat); }}>
              <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); onDeleteCat(cat); }}>
              <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              cat={child}
              categories={categories}
              documents={documents}
              depth={depth + 1}
              isAdmin={isAdmin}
              rootParentId={null}
              onNavigate={onNavigate}
              onEditCat={onEditCat}
              onDeleteCat={onDeleteCat}
              onDownloadDoc={onDownloadDoc}
              onEditDoc={onEditDoc}
              onDeleteDoc={onDeleteDoc}
              onMoveDoc={onMoveDoc}
              getFolderIcon={getFolderIcon}
              ModifiedInfo={ModifiedInfo}
            />
          ))}
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 group"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
              onClick={() => onDownloadDoc(doc)}
              draggable={isAdmin}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", doc.id); e.dataTransfer.effectAllowed = "move"; }}
            >
              <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">{doc.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(doc.file_size)}</span>
              {isAdmin && (
                <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent" onClick={(e) => { e.stopPropagation(); onEditDoc(doc); }}>
                    <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                  <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); onDeleteDoc(doc); }}>
                    <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView(props: TreeViewProps) {
  const rootCats = props.categories.filter((c) => c.parent_id === props.rootParentId);
  return (
    <div className="border border-border rounded-2xl bg-card p-2 space-y-0.5">
      {rootCats.map((cat) => (
        <TreeNode key={cat.id} cat={cat} depth={0} {...props} />
      ))}
    </div>
  );
}

export default function Drive() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DriveDocument[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentCatId, setCurrentCatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [density, setDensity] = useState<Density>("comfortable");

  // Dialog states
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catParentId, setCatParentId] = useState<string | null>(null);
  const [catIconFile, setCatIconFile] = useState<File | null>(null);
  const [catIconPreview, setCatIconPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "cat" | "doc"; id: string; name: string } | null>(null);

  // Upload / Edit doc
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DriveDocument | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Drag-drop for moving documents
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  // Auto-open upload dialog if ?upload=1
  useEffect(() => {
    if (searchParams.get("upload") === "1" && isAdmin && currentCatId) {
      openUploadDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCatId]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cats }, { data: docs }, { data: profs }] = await Promise.all([
      supabase.from("drive_categories").select("*").order("sort_order"),
      supabase.from("drive_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setCategories((cats as Category[]) ?? []);
    setDocuments((docs as DriveDocument[]) ?? []);
    const profileMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { if (p.user_id && p.display_name) profileMap[p.user_id] = p.display_name; });
    setProfiles(profileMap);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const breadcrumb = useMemo(() => {
    const trail: Category[] = [];
    let id = currentCatId;
    while (id) {
      const cat = categories.find((c) => c.id === id);
      if (!cat) break;
      trail.unshift(cat);
      id = cat.parent_id;
    }
    return trail;
  }, [currentCatId, categories]);

  const childCategories = categories.filter((c) => c.parent_id === currentCatId);
  const currentDocs = documents.filter((d) => d.category_id === currentCatId);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const matchedDocs = documents.filter(
      (d) => d.title.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q)
    );
    const matchedCats = categories.filter((c) => c.name.toLowerCase().includes(q));
    return { docs: matchedDocs, cats: matchedCats };
  }, [search, documents, categories]);

  // Category CRUD
  const openNewCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatParentId(currentCatId);
    setCatIconFile(null);
    setCatIconPreview(null);
    setCatDialogOpen(true);
  };
  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatParentId(cat.parent_id);
    setCatIconFile(null);
    setCatIconPreview(cat.icon_url);
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    let iconUrl = editingCat?.icon_url || null;

    // Upload icon if provided
    if (catIconFile) {
      if (catIconFile.size > MAX_IMAGE_SIZE) {
        toast.error(`L'icône ne doit pas dépasser ${formatSize(MAX_IMAGE_SIZE)}`);
        return;
      }
      const ext = catIconFile.name.split(".").pop();
      const path = `icons/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("drive-files").upload(path, catIconFile);
      if (upErr) { toast.error("Erreur upload icône"); return; }
      const { data: urlData } = supabase.storage.from("drive-files").getPublicUrl(path);
      iconUrl = urlData.publicUrl;
    }

    if (editingCat) {
      await supabase.from("drive_categories").update({
        name: catName.trim(),
        parent_id: catParentId,
        icon_url: iconUrl,
        updated_by: user?.id ?? null,
      }).eq("id", editingCat.id);
      toast.success("Catégorie modifiée");
    } else {
      await supabase.from("drive_categories").insert({
        name: catName.trim(),
        parent_id: catParentId,
        icon_url: iconUrl,
        updated_by: user?.id ?? null,
      });
      toast.success("Catégorie créée");
    }
    setCatDialogOpen(false);
    fetchAll();
  };

  const removeCatIcon = () => {
    setCatIconFile(null);
    setCatIconPreview(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "cat") {
      await supabase.from("drive_categories").delete().eq("id", deleteTarget.id);
      if (currentCatId === deleteTarget.id) setCurrentCatId(null);
      toast.success("Catégorie supprimée");
    } else {
      const doc = documents.find((d) => d.id === deleteTarget.id);
      if (doc) {
        const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
        if (path) await supabase.storage.from("drive-files").remove([decodeURIComponent(path)]);
      }
      await supabase.from("drive_documents").delete().eq("id", deleteTarget.id);
      toast.success("Document supprimé");
    }
    setDeleteTarget(null);
    fetchAll();
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

  const validateFile = (file: File, maxSize: number, label: string): boolean => {
    if (file.size > maxSize) {
      toast.error(`${label} ne doit pas dépasser ${formatSize(maxSize)}`);
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!editingDoc && !uploadFile) return;
    if (!editingDoc && !currentCatId) return;

    // Validate sizes
    if (uploadFile && !validateFile(uploadFile, MAX_FILE_SIZE, "Le fichier")) return;
    if (uploadImage && !validateFile(uploadImage, MAX_IMAGE_SIZE, "L'image")) return;

    setUploading(true);
    try {
      let fileUrl = editingDoc?.file_url || "";
      let fileName = editingDoc?.file_name || "";
      let fileSize = editingDoc?.file_size || 0;
      let mimeType = editingDoc?.mime_type || "";
      let imageUrl = editingDoc?.image_url || null;

      if (uploadFile) {
        const ext = uploadFile.name.split(".").pop();
        const path = `${currentCatId || editingDoc?.category_id}/${Date.now()}.${ext}`;
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
        const imgPath = `${currentCatId || editingDoc?.category_id}/img_${Date.now()}.${imgExt}`;
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
          category_id: currentCatId!,
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
      if (!path) { window.open(doc.file_url, "_blank"); return; }
      const { data, error } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 60);
      if (error || !data?.signedUrl) { window.open(doc.file_url, "_blank"); return; }
      window.open(data.signedUrl, "_blank");
    } catch { window.open(doc.file_url, "_blank"); }
  };

  const getCatPath = (catId: string): string => {
    const parts: string[] = [];
    let id: string | null = catId;
    while (id) {
      const cat = categories.find((c) => c.id === id);
      if (!cat) break;
      parts.unshift(cat.name);
      id = cat.parent_id;
    }
    return parts.join(" / ");
  };

  const getModifierName = (userId: string | null) => {
    if (!userId) return null;
    return profiles[userId] || null;
  };

  // Drag-drop: move document to another category
  const handleDocDragStart = useCallback((e: React.DragEvent, docId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingDocId(docId);
  }, []);

  const handleCatDragOver = useCallback((e: React.DragEvent, catId: string) => {
    if (!draggingDocId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCatId(catId);
  }, [draggingDocId]);

  const handleCatDragLeave = useCallback(() => {
    setDragOverCatId(null);
  }, []);

  const handleCatDrop = useCallback(async (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault();
    setDragOverCatId(null);
    if (!draggingDocId || !isAdmin) return;

    const doc = documents.find((d) => d.id === draggingDocId);
    if (!doc || doc.category_id === targetCatId) {
      setDraggingDocId(null);
      return;
    }

    await supabase.from("drive_documents").update({
      category_id: targetCatId,
      updated_by: user?.id ?? null,
    }).eq("id", draggingDocId);

    toast.success(`Document déplacé vers ${categories.find((c) => c.id === targetCatId)?.name || "dossier"}`);
    setDraggingDocId(null);
    fetchAll();
  }, [draggingDocId, documents, categories, isAdmin, user]);

  const handleDragEnd = useCallback(() => {
    setDraggingDocId(null);
    setDragOverCatId(null);
  }, []);

  const ModifiedInfo = ({ updatedAt, updatedBy }: { updatedAt: string; updatedBy: string | null }) => {
    const name = getModifierName(updatedBy);
    return (
      <p className="text-[10px] text-muted-foreground">
        Modifié {formatModifiedDate(updatedAt)}
        {name && <> par <span className="font-medium">{name}</span></>}
      </p>
    );
  };

  // Card view for documents
  const DocCard = ({ doc }: { doc: DriveDocument }) => (
    <Card
      className={`group cursor-pointer transition-all hover:shadow-hover hover:-translate-y-0.5 overflow-hidden relative ${draggingDocId === doc.id ? "opacity-50" : ""}`}
      onClick={() => downloadDoc(doc)}
      draggable={isAdmin}
      onDragStart={(e) => handleDocDragStart(e, doc.id)}
      onDragEnd={handleDragEnd}
    >
      <CardContent className="p-0">
        {doc.image_url ? (
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            <img src={doc.image_url} alt={doc.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center">
            <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="p-3 space-y-1">
          <p className="text-sm font-semibold text-center leading-tight line-clamp-2">{doc.title}</p>
          {doc.description && <p className="text-xs text-muted-foreground text-center line-clamp-2">{doc.description}</p>}
          {doc.file_size ? <p className="text-[10px] text-muted-foreground text-center">{formatSize(doc.file_size)}</p> : null}
          <ModifiedInfo updatedAt={doc.updated_at} updatedBy={doc.updated_by} />
        </div>
        {isAdmin && (
          <div className="absolute top-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button className="h-6 w-6 rounded-full bg-card/90 flex items-center justify-center hover:bg-accent shadow-sm" onClick={(e) => { e.stopPropagation(); openUploadDialog(doc); }}>
              <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            <button className="h-6 w-6 rounded-full bg-card/90 flex items-center justify-center hover:bg-destructive/20 shadow-sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "doc", id: doc.id, name: doc.title }); }}>
              <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
            </button>
          </div>
        )}
        {isAdmin && (
          <div className="absolute top-1.5 left-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <div className="h-6 w-6 rounded-full bg-card/90 flex items-center justify-center shadow-sm cursor-grab" title="Glisser pour déplacer">
              <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faFolder} className="text-primary" />
            Drive
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs w-full">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            {/* Quick upload button */}
            {isAdmin && currentCatId && (
              <Button size="sm" variant="default" className="gap-1.5 h-10 shrink-0" onClick={() => openUploadDialog()}>
                <FontAwesomeIcon icon={faUpload} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Uploader</span>
              </Button>
            )}
            {/* View mode toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
              <button className={`h-10 w-10 flex items-center justify-center transition-colors ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`} onClick={() => setViewMode("cards")} title="Vue cartes">
                <FontAwesomeIcon icon={faGrip} className="h-4 w-4" />
              </button>
              <button className={`h-10 w-10 flex items-center justify-center transition-colors ${viewMode === "tree" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`} onClick={() => setViewMode("tree")} title="Vue arborescence">
                <FontAwesomeIcon icon={faList} className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File size info */}
        <p className="text-[10px] text-muted-foreground">
          Fichiers : max {formatSize(MAX_FILE_SIZE)} • Images : max {formatSize(MAX_IMAGE_SIZE)} (JPG, PNG, WebP, SVG)
        </p>

        {/* Search results */}
        {searchResults ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {searchResults.docs.length + searchResults.cats.length} résultat(s) pour « {search} »
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Effacer</Button>
            </div>
            {searchResults.cats.map((cat) => (
              <Card key={cat.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setCurrentCatId(cat.id); setSearch(""); }}>
                <CardContent className="p-3 flex items-center gap-3">
                  {(() => {
                    const iconSrc = getFolderIcon(cat);
                    return iconSrc ? (
                      <img src={iconSrc} alt="" className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <FontAwesomeIcon icon={faFolder} className="h-5 w-5 text-primary" />
                    );
                  })()}
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{getCatPath(cat.id)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {searchResults.docs.map((doc) => (
              <Card key={doc.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => downloadDoc(doc)}>
                <CardContent className="p-3 flex items-center gap-3">
                  {doc.image_url ? (
                    <img src={doc.image_url} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{getCatPath(doc.category_id)} • {formatSize(doc.file_size)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === "tree" ? (
          <>
            {/* Admin actions for tree view */}
            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openNewCat}>
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Catégorie
                </Button>
              </div>
            )}
            <TreeView
              categories={categories}
              documents={documents}
              rootParentId={null}
              isAdmin={isAdmin}
              onNavigate={setCurrentCatId}
              onEditCat={openEditCat}
              onDeleteCat={(cat) => setDeleteTarget({ type: "cat", id: cat.id, name: cat.name })}
              onDownloadDoc={downloadDoc}
              onEditDoc={(doc) => openUploadDialog(doc)}
              onDeleteDoc={(doc) => setDeleteTarget({ type: "doc", id: doc.id, name: doc.title })}
              onMoveDoc={async (docId, targetCatId) => {
                await supabase.from("drive_documents").update({
                  category_id: targetCatId,
                  updated_by: user?.id ?? null,
                }).eq("id", docId);
                toast.success("Document déplacé");
                fetchAll();
              }}
              getFolderIcon={getFolderIcon}
              ModifiedInfo={ModifiedInfo}
            />
            {categories.filter(c => c.parent_id === null).length === 0 && (
              <div className="text-center py-16">
                <FontAwesomeIcon icon={faFolder} className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Aucune catégorie. Commencez par en créer une.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 flex-wrap text-sm">
              <button className="text-primary hover:underline font-medium" onClick={() => setCurrentCatId(null)}>Drive</button>
              {breadcrumb.map((cat) => (
                <span key={cat.id} className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChevronRight} className="h-2.5 w-2.5 text-muted-foreground" />
                  <button className="text-primary hover:underline font-medium" onClick={() => setCurrentCatId(cat.id)}>{cat.name}</button>
                </span>
              ))}
            </div>

            {/* Back button */}
            {currentCatId && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => {
                const parent = categories.find((c) => c.id === currentCatId)?.parent_id ?? null;
                setCurrentCatId(parent);
              }}>
                <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Retour
              </Button>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openNewCat}>
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                  {currentCatId ? "Sous-catégorie" : "Catégorie"}
                </Button>
                {currentCatId && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openUploadDialog()}>
                    <FontAwesomeIcon icon={faUpload} className="h-3 w-3" /> Ajouter un document
                  </Button>
                )}
              </div>
            )}

            {/* Categories grid */}
            {childCategories.length > 0 && (
              <div className={density === "compact" ? "grid-compact" : "grid-content"}>
                {childCategories.map((cat) => {
                  const subCount = categories.filter((c) => c.parent_id === cat.id).length;
                  const docCount = documents.filter((d) => d.category_id === cat.id).length;
                  const isDragOver = dragOverCatId === cat.id;
                  return (
                    <Card
                      key={cat.id}
                      className={`group cursor-pointer transition-all hover:shadow-hover hover:-translate-y-0.5 ${isDragOver ? "ring-2 ring-primary bg-primary/5" : ""}`}
                      onClick={() => setCurrentCatId(cat.id)}
                      onDragOver={(e) => handleCatDragOver(e, cat.id)}
                      onDragLeave={handleCatDragLeave}
                      onDrop={(e) => handleCatDrop(e, cat.id)}
                    >
                      <CardContent className="p-5 flex flex-col items-center gap-3 relative">
                        {(() => {
                          const iconSrc = getFolderIcon(cat);
                          return iconSrc ? (
                            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
                              <img src={iconSrc} alt={cat.name} className="h-7 w-7 object-contain" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
                              <FontAwesomeIcon icon={faFolderOpen} className="h-5 w-5 text-primary" />
                            </div>
                          );
                        })()}
                        <p className="text-sm font-medium text-foreground text-center leading-snug">{cat.name}</p>
                        <div className="flex gap-1.5">
                          {subCount > 0 && <Badge variant="secondary" className="text-[10px]">{subCount} sous-cat.</Badge>}
                          {docCount > 0 && <Badge variant="outline" className="text-[10px]">{docCount} doc.</Badge>}
                        </div>
                        {isAdmin && (
                          <div className="absolute top-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-accent" onClick={(e) => { e.stopPropagation(); openEditCat(cat); }}>
                              <FontAwesomeIcon icon={faPen} className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                            <button className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "cat", id: cat.id, name: cat.name }); }}>
                              <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Documents */}
            {currentDocs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Documents
                  {isAdmin && draggingDocId && <span className="text-primary ml-2">— Glissez sur un dossier pour déplacer</span>}
                </p>
                <div className={density === "compact" ? "grid-compact" : "grid-content"}>
                  {currentDocs.map((doc) => (
                    <div key={doc.id} className="relative">
                      <DocCard doc={doc} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {childCategories.length === 0 && currentDocs.length === 0 && (
              <div className="text-center py-16">
                <FontAwesomeIcon icon={faFolder} className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {currentCatId ? "Ce dossier est vide" : "Aucune catégorie. Commencez par en créer une."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Nom</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nom de la catégorie" />
            </div>
            <div>
              <Label className="text-xs">Catégorie parente</Label>
              <Select value={catParentId ?? "__root__"} onValueChange={(v) => setCatParentId(v === "__root__" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Racine (aucun parent)</SelectItem>
                  {categories.filter((c) => c.id !== editingCat?.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{getCatPath(c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Icône du dossier (optionnel — max {formatSize(MAX_IMAGE_SIZE)})</Label>
              {catIconPreview ? (
                <div className="flex items-center gap-3 mt-1">
                  <img src={catIconFile ? URL.createObjectURL(catIconFile) : catIconPreview} alt="Icône" className="h-12 w-12 rounded-lg object-cover border border-border" />
                  <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={removeCatIcon}>
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" /> Retirer
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > MAX_IMAGE_SIZE) {
                        toast.error(`L'icône ne doit pas dépasser ${formatSize(MAX_IMAGE_SIZE)}`);
                        return;
                      }
                      setCatIconFile(f);
                      setCatIconPreview(URL.createObjectURL(f));
                    }
                  }}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveCat} disabled={!catName.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Supprimer {deleteTarget?.type === "cat" ? "la catégorie" : "le document"} « {deleteTarget?.name} » ?
              {deleteTarget?.type === "cat" && " Tous les sous-dossiers et documents seront supprimés."}
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
