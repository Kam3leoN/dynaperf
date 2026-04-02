import { useState, useEffect, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolder,
  faFolderOpen,
  faPlus,
  faPen,
  faTrash,
  faFile,
  faUpload,
  faSearch,
  faChevronRight,
  faArrowLeft,
  faDownload,
  faFilePdf,
  faFileImage,
  faFileExcel,
  faFileWord,
} from "@fortawesome/free-solid-svg-icons";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface Document {
  id: string;
  category_id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

function fileIcon(mime: string) {
  if (mime.includes("pdf")) return faFilePdf;
  if (mime.includes("image")) return faFileImage;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return faFileExcel;
  if (mime.includes("word") || mime.includes("document")) return faFileWord;
  return faFile;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function Drive() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCatId, setCurrentCatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialog states
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catParentId, setCatParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "cat" | "doc"; id: string; name: string } | null>(null);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cats }, { data: docs }] = await Promise.all([
      supabase.from("drive_categories").select("*").order("sort_order"),
      supabase.from("drive_documents").select("*").order("created_at", { ascending: false }),
    ]);
    setCategories((cats as Category[]) ?? []);
    setDocuments((docs as Document[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Navigation breadcrumb
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

  // Filtered view
  const childCategories = categories.filter((c) => c.parent_id === currentCatId);
  const currentDocs = documents.filter((d) => d.category_id === currentCatId);

  // Search results
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
    setCatDialogOpen(true);
  };
  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatParentId(cat.parent_id);
    setCatDialogOpen(true);
  };
  const saveCat = async () => {
    if (!catName.trim()) return;
    if (editingCat) {
      await supabase.from("drive_categories").update({ name: catName.trim(), parent_id: catParentId }).eq("id", editingCat.id);
      toast.success("Catégorie modifiée");
    } else {
      await supabase.from("drive_categories").insert({ name: catName.trim(), parent_id: catParentId });
      toast.success("Catégorie créée");
    }
    setCatDialogOpen(false);
    fetchAll();
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

  // Upload
  const handleUpload = async () => {
    if (!uploadFile || !currentCatId) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const path = `${currentCatId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("drive-files").upload(path, uploadFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("drive-files").getPublicUrl(path);
      await supabase.from("drive_documents").insert({
        category_id: currentCatId,
        title: uploadTitle.trim() || uploadFile.name,
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        uploaded_by: user?.id,
      });
      toast.success("Document ajouté !");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc: Document) => {
    try {
      const path = new URL(doc.file_url).pathname.split("/drive-files/")[1];
      if (!path) { window.open(doc.file_url, "_blank"); return; }
      const { data, error } = await supabase.storage.from("drive-files").createSignedUrl(decodeURIComponent(path), 60);
      if (error || !data?.signedUrl) { window.open(doc.file_url, "_blank"); return; }
      window.open(data.signedUrl, "_blank");
    } catch {
      window.open(doc.file_url, "_blank");
    }
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
          <div className="relative max-w-xs w-full">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

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
                  <FontAwesomeIcon icon={faFolder} className="h-5 w-5 text-primary" />
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
                  <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{getCatPath(doc.category_id)} • {formatSize(doc.file_size)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 flex-wrap text-sm">
              <button className="text-primary hover:underline font-medium" onClick={() => setCurrentCatId(null)}>
                Drive
              </button>
              {breadcrumb.map((cat) => (
                <span key={cat.id} className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChevronRight} className="h-2.5 w-2.5 text-muted-foreground" />
                  <button className="text-primary hover:underline font-medium" onClick={() => setCurrentCatId(cat.id)}>
                    {cat.name}
                  </button>
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
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setUploadTitle(""); setUploadFile(null); setUploadOpen(true); }}>
                    <FontAwesomeIcon icon={faUpload} className="h-3 w-3" /> Ajouter un document
                  </Button>
                )}
              </div>
            )}

            {/* Categories grid */}
            {childCategories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {childCategories.map((cat) => {
                  const subCount = categories.filter((c) => c.parent_id === cat.id).length;
                  const docCount = documents.filter((d) => d.category_id === cat.id).length;
                  return (
                    <Card key={cat.id} className="group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5" onClick={() => setCurrentCatId(cat.id)}>
                      <CardContent className="p-4 flex flex-col items-center gap-2 relative">
                        <FontAwesomeIcon icon={faFolderOpen} className="h-8 w-8 text-primary/80" />
                        <p className="text-sm font-semibold text-center leading-tight">{cat.name}</p>
                        <div className="flex gap-1.5">
                          {subCount > 0 && <Badge variant="secondary" className="text-[10px]">{subCount} sous-cat.</Badge>}
                          {docCount > 0 && <Badge variant="outline" className="text-[10px]">{docCount} doc.</Badge>}
                        </div>
                        {isAdmin && (
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {/* Documents list */}
            {currentDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
                {currentDocs.map((doc) => (
                  <Card key={doc.id} className="group">
                    <CardContent className="p-3 flex items-center gap-3">
                      <FontAwesomeIcon icon={fileIcon(doc.mime_type)} className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_name} • {formatSize(doc.file_size)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDoc(doc)}>
                          <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteTarget({ type: "doc", id: doc.id, name: doc.title })}>
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveCat} disabled={!catName.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Titre (optionnel)</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Titre du document" />
            </div>
            <div>
              <Label className="text-xs">Fichier</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? "Envoi…" : "Envoyer"}
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
