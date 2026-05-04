import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StepZeroForm, StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import { AuditItemCard, ItemAnswer } from "@/components/audit-stepper/AuditItemCard";
import { AuditPhotoUpload } from "@/components/audit-stepper/AuditPhotoUpload";
import { fetchAuditConfig, fetchAuditConfigById, AuditTypeConfig } from "@/data/auditItems";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextSubHeader } from "@/components/context-sub-header";
import { format } from "date-fns";
import { MOIS_ORDRE } from "@/data/audits";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { AuditCreationFabMenu } from "@/components/audit-stepper/AuditCreationFabMenu";
import {
  buildAuditDraftStorageKey,
  buildPersistableDraftJson,
  clearAuditDraft,
  draftHasContent,
  loadAuditDraft,
} from "@/lib/auditDraftStorage";
import { fireAuditCompletionConfetti } from "@/lib/confettiAuditComplete";
import { scrollEntireLayoutToTopAsync, scrollLayoutMainToTop } from "@/lib/scrollLayout";

/** JSON PostgreSQL : pas de NaN/Infinity, pas de clés undefined (via stringify). */
function sanitizeItemsJson(items: Record<string, unknown>): Json {
  try {
    const s = JSON.stringify(items, (_, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v));
    return JSON.parse(s) as Json;
  } catch {
    return items as Json;
  }
}

function formatSupabaseError(e: unknown): string {
  if (e && typeof e === "object") {
    const x = e as { message?: string; details?: string; hint?: string };
    const parts = [x.message, x.details, x.hint].filter((s) => typeof s === "string" && s.trim());
    if (parts.length) return parts.join(" — ");
  }
  if (e instanceof Error) return e.message;
  return "Erreur d’enregistrement";
}

export default function AuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { auditId } = useParams<{ auditId: string }>();
  const typeEvenement = searchParams.get("type") || "RD Présentiel";
  const typeId = searchParams.get("typeId") || "";
  const isEditMode = !!auditId;

  const draftStorageKey = useMemo(
    () => buildAuditDraftStorageKey(typeEvenement, typeId),
    [typeEvenement, typeId],
  );

  const initialDraft = useMemo(() => {
    if (typeof window === "undefined" || isEditMode) return null;
    return loadAuditDraft(buildAuditDraftStorageKey(typeEvenement, typeId));
  }, [isEditMode, typeEvenement, typeId]);

  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [phase, setPhase] = useState<"main" | "photos" | "saving">("main");
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | undefined>(initialDraft?.stepZeroData);
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>(initialDraft?.answers ?? {});
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [signatureAuditeur, setSignatureAuditeur] = useState<string | null>(
    initialDraft?.signatureAuditeur ?? null,
  );
  const [signatureAudite, setSignatureAudite] = useState<string | null>(initialDraft?.signatureAudite ?? null);
  const [editLoaded, setEditLoaded] = useState(false);
  const [requiredFieldIds, setRequiredFieldIds] = useState<string[]>([]);
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  /** Ancre en tête du formulaire : `scrollIntoView` cible le bon conteneur (souvent plus fiable que `scrollTo` sur `<main>` seul). */
  const auditFormTopAnchorRef = useRef<HTMLDivElement>(null);
  const prevDraftKeyRef = useRef<string | null>(null);
  const draftWelcomeToastKeyRef = useRef<string | null>(null);
  /** Changement de type d’audit (query) ou toast unique si brouillon présent au chargement. */
  useEffect(() => {
    if (isEditMode) {
      prevDraftKeyRef.current = draftStorageKey;
      return;
    }
    const prev = prevDraftKeyRef.current;
    prevDraftKeyRef.current = draftStorageKey;
    const isKeyChange = prev !== null && prev !== draftStorageKey;

    if (isKeyChange) {
      const snap = loadAuditDraft(draftStorageKey);
      if (snap && draftHasContent(snap)) {
        setStepZeroData(snap.stepZeroData);
        setAnswers(snap.answers);
        setSignatureAuditeur(snap.signatureAuditeur);
        setSignatureAudite(snap.signatureAudite);
        toast.info("Brouillon local chargé pour ce type d'événement.");
      } else {
        setStepZeroData(undefined);
        setAnswers({});
        setSignatureAuditeur(null);
        setSignatureAudite(null);
      }
      setPhotos([]);
      setPhase("main");
      draftWelcomeToastKeyRef.current = draftStorageKey;
      return;
    }

    const snap = loadAuditDraft(draftStorageKey);
    if (
      snap &&
      draftHasContent(snap) &&
      draftWelcomeToastKeyRef.current !== draftStorageKey
    ) {
      draftWelcomeToastKeyRef.current = draftStorageKey;
      toast.info("Brouillon local restauré — vos dernières saisies ont été rechargées.");
    }
  }, [draftStorageKey, isEditMode]);

  // Auto-save (serveur uniquement en mode édition — pas de sauvegarde progressive en création)
  const draftIdRef = useRef<string | null>(auditId ?? null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(isEditMode ? 'saved' : 'idle');
  const isSavingRef = useRef(false);

  // Load required custom field IDs for progress tracking
  useEffect(() => {
    supabase
      .from("audit_type_custom_fields")
      .select("id")
      .eq("audit_type_key", typeEvenement)
      .eq("is_required", true)
      .then(({ data }) => setRequiredFieldIds(data?.map((f) => f.id) ?? []));
  }, [typeEvenement]);

  // Load config - prefer typeId if provided, fallback to typeKey
  useEffect(() => {
    const loadConfig = typeId
      ? fetchAuditConfigById(typeId)
      : fetchAuditConfig(typeEvenement);
    loadConfig.then((c) => {
      setConfig(c);
      setConfigLoading(false);
    });
  }, [typeEvenement, typeId]);

  // Load existing audit data for edit mode
  useEffect(() => {
    if (!isEditMode || !auditId || editLoaded) return;
    
    const loadExistingAudit = async () => {
      const [{ data: audit }, { data: detail }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", auditId).single(),
        /** Planifié seul : pas encore de ligne `audit_details` — `.single()` échouerait. */
        supabase.from("audit_details").select("*").eq("audit_id", auditId).maybeSingle(),
      ]);

      if (audit) {
        const detailItems = detail?.items as Record<string, unknown> | undefined;
        const customFieldValues =
          (detailItems?.__custom_fields as Record<string, unknown> | undefined) || {};
        
        setStepZeroData({
          partenaireAudite: audit.partenaire,
          partenaireReferent: detail?.partenaire_referent || "",
          auditeur: audit.auditeur,
          lieu: audit.lieu || "",
          typeLieu: detail?.type_lieu || "",
          dateEvenement: new Date(audit.date),
          heureEvenement: detail?.heure_evenement || "",
          heureDebutPrevue: detail?.heure_debut_prevue || "",
          heureFinPrevue: detail?.heure_fin_prevue || "",
          heureDebutReelle: detail?.heure_debut_reelle || "",
          heureFinReelle: detail?.heure_fin_reelle || "",
          nomClub: detail?.nom_club || undefined,
          qualiteLieu: detail?.qualite_lieu ?? undefined,
          nbAdherents: detail?.nb_adherents ?? undefined,
          nbInvites: detail?.nb_invites ?? undefined,
          nbNoShow: detail?.nb_no_show ?? undefined,
          nbParticipants: detail?.nb_participants ?? undefined,
          nbRdvPris: detail?.nb_rdv_pris ?? undefined,
          customFieldValues,
        });

        if (detail?.items) {
          const itemsData = detail.items as Record<string, unknown>;
          const loadedAnswers: Record<string, ItemAnswer> = {};
          Object.entries(itemsData).forEach(([id, ans]) => {
            if (id === "__custom_fields") return;
            const a = ans as {
              score?: number;
              comment?: string;
              checklist?: boolean[];
              rawValue?: number;
              notApplicable?: boolean;
            };
            loadedAnswers[id] = {
              score: a.score ?? 0,
              touched: true,
              comment: a.comment,
              checklist: a.checklist,
              rawValue: a.rawValue,
              notApplicable: a.notApplicable ?? false,
            };
          });
          setAnswers(loadedAnswers);
        }

        if (detail?.photos) {
          setExistingPhotos(detail.photos as string[]);
        }
        if (detail?.signature_auditeur) setSignatureAuditeur(detail.signature_auditeur);
        if (detail?.signature_audite) setSignatureAudite(detail.signature_audite);
      }
      setEditLoaded(true);
    };
    loadExistingAudit();
  }, [isEditMode, auditId, editLoaded]);

  const allItems = useMemo(
    () =>
      config?.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      ) ?? [],
    [config]
  );

  const totalItems = allItems.length;
  const answeredCount = Object.values(answers).filter((a) => a.touched).length;

  // Count filled required custom fields
  const infoFilled = requiredFieldIds.filter((id) => {
    const val = stepZeroData?.customFieldValues?.[id];
    return val !== undefined && val !== null && val !== "";
  }).length;

  const totalExpected = requiredFieldIds.length + totalItems;
  const totalFilled = infoFilled + answeredCount;
  const progress = totalExpected > 0 ? (totalFilled / totalExpected) * 100 : 0;

  const infoValid = requiredFieldIds.length === 0 || infoFilled === requiredFieldIds.length;

  const handleStepZeroChange = useCallback((data: StepZeroData) => {
    setStepZeroData(data);
  }, []);

  const handleItemChange = useCallback((itemId: string, answer: ItemAnswer) => {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }));
  }, []);

  // --- Auto-save infrastructure ---
  const latestRef = useRef({ stepZeroData, answers, signatureAuditeur, signatureAudite, existingPhotos });
  useEffect(() => {
    latestRef.current = { stepZeroData, answers, signatureAuditeur, signatureAudite, existingPhotos };
  });

  const buildAuditPayloads = useCallback((
    szd: StepZeroData,
    ans: Record<string, ItemAnswer>,
    photosList: string[],
    sigAuditeur: string | null,
    sigAudite: string | null,
  ) => {
    const applicableAnswers = Object.entries(ans).filter(([, a]) => !a.notApplicable);
    const totalPointsCalc = applicableAnswers.reduce((s, [, a]) => s + a.score, 0);
    const applicableMaxPoints = allItems.filter(i => !ans[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0);
    const noteSur10 = applicableMaxPoints > 0 ? +((totalPointsCalc / applicableMaxPoints) * 10).toFixed(2) : 0;

    const dateStr = szd.dateEvenement
      ? format(szd.dateEvenement, "yyyy-MM-dd")
      : new Date().toISOString().slice(0, 10);

    const month = szd.dateEvenement ? szd.dateEvenement.getMonth() : new Date().getMonth();
    const moisVersementIdx = Math.min(month + 1, 11);
    const moisVersement = MOIS_ORDRE[moisVersementIdx];

    const safeNote = Number.isFinite(noteSur10) ? noteSur10 : 0;

    const auditPayload = {
      date: dateStr,
      partenaire: szd.partenaireAudite || "—",
      lieu: szd.lieu,
      auditeur: szd.auditeur || "—",
      type_evenement: typeEvenement,
      note: safeNote,
      mois_versement: moisVersement,
    };

    const itemsJson: Record<string, unknown> = {};
    Object.entries(ans).forEach(([id, a]) => {
      itemsJson[id] = {
        score: a.score,
        ...(a.comment && { comment: a.comment }),
        ...(a.checklist && { checklist: a.checklist }),
        ...(a.rawValue !== undefined && { rawValue: a.rawValue }),
        ...(a.notApplicable && { notApplicable: true }),
      };
    });
    if (szd.customFieldValues && Object.keys(szd.customFieldValues).length > 0) {
      itemsJson["__custom_fields"] = szd.customFieldValues;
    }

    const itemsPayload = sanitizeItemsJson(itemsJson);

    const detailPayload: Database["public"]["Tables"]["audit_details"]["Insert"] = {
      audit_id: draftIdRef.current || "",
      partenaire_referent: szd.partenaireReferent || null,
      type_lieu: szd.typeLieu || null,
      qualite_lieu: szd.qualiteLieu ?? null,
      heure_evenement: szd.heureEvenement || null,
      heure_debut_prevue: szd.heureDebutPrevue || null,
      heure_fin_prevue: szd.heureFinPrevue || null,
      heure_debut_reelle: szd.heureDebutReelle || null,
      heure_fin_reelle: szd.heureFinReelle || null,
      nom_club: szd.nomClub || null,
      nb_adherents: szd.nbAdherents ?? null,
      nb_invites: szd.nbInvites ?? null,
      nb_no_show: szd.nbNoShow ?? null,
      nb_participants: szd.nbParticipants ?? null,
      nb_rdv_pris: szd.nbRdvPris ?? null,
      items: itemsPayload,
      total_points: totalPointsCalc,
      note_sur_10: safeNote,
      photos: photosList,
      signature_auditeur: sigAuditeur,
      signature_audite: sigAudite,
    };

    return { auditPayload, detailPayload, noteSur10 };
  }, [allItems, typeEvenement]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current || !config) return false;
    const { stepZeroData: szd, answers: ans, signatureAuditeur: sa, signatureAudite: sp, existingPhotos: ep } = latestRef.current;
    if (!szd) return false;

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        toast.error("Session expirée — reconnectez-vous pour enregistrer l’audit sur le serveur.");
        setSaveStatus("error");
        return false;
      }
      const uid = authData.user.id;

      const { auditPayload, detailPayload } = buildAuditPayloads(szd, ans, ep, sa, sp);

      if (draftIdRef.current) {
        const { error: auditErr } = await supabase.from("audits").update(auditPayload).eq("id", draftIdRef.current);
        if (auditErr) throw auditErr;
        const { data: existing, error: selErr } = await supabase.from("audit_details").select("id").eq("audit_id", draftIdRef.current).maybeSingle();
        if (selErr) throw selErr;
        if (existing) {
          const { error: detErr } = await supabase
            .from("audit_details")
            .update({ ...detailPayload, audit_id: draftIdRef.current })
            .eq("audit_id", draftIdRef.current);
          if (detErr) throw detErr;
        } else {
          const { error: insErr } = await supabase.from("audit_details").insert({ ...detailPayload, audit_id: draftIdRef.current });
          if (insErr) throw insErr;
        }
      } else {
        const { data, error } = await supabase
          .from("audits")
          .insert({ ...auditPayload, statut: "NON", created_by: uid })
          .select("id")
          .single();
        if (error) throw error;
        draftIdRef.current = data.id;
        const { error: detErr } = await supabase.from("audit_details").insert({ ...detailPayload, audit_id: data.id });
        if (detErr) throw detErr;
      }
      setSaveStatus("saved");
      return true;
    } catch (e) {
      console.error("saveDraft", e);
      toast.error(`Enregistrement : ${formatSupabaseError(e)}`);
      setSaveStatus("error");
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [config, buildAuditPayloads]);

  /** Brouillon local — uniquement sur action explicite (FAB) ou parcours existant ; plus de persistance debouncée. */
  const writeLocalAuditDraft = useCallback(() => {
    const { stepZeroData: szd, answers: ans, signatureAuditeur: sa, signatureAudite: sp } = latestRef.current;
    const json = buildPersistableDraftJson(szd, ans, sa, sp);
    try {
      if (json) {
        localStorage.setItem(draftStorageKey, json);
      } else {
        clearAuditDraft(draftStorageKey);
      }
    } catch {
      /* quota ou navigation privée */
    }
  }, [draftStorageKey]);

  const handleFabSaveProgress = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    if (!latestRef.current.stepZeroData) {
      toast.info("Renseignez d’abord les informations générales pour enregistrer sur le serveur.");
      return;
    }
    const ok = await saveDraft();
    writeLocalAuditDraft();
    if (ok) {
      toast.success("Progression enregistrée — vous pouvez poursuivre l’audit.");
    }
  }, [saveDraft, writeLocalAuditDraft]);

  // Sauvegarde serveur automatique (debounce) — uniquement en modification d’audit existant
  useEffect(() => {
    if (!isEditMode) return;
    if (!stepZeroData && Object.keys(answers).length === 0) return;
    if (phase !== "main") return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveDraft(), 3000);
    return () => clearTimeout(saveTimerRef.current);
  }, [isEditMode, stepZeroData, answers, signatureAuditeur, signatureAudite, existingPhotos, saveDraft, phase]);

  const handleGoToPhotos = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    await saveDraft();
    setPhase("photos");
    scrollLayoutMainToTop("smooth");
  }, [saveDraft]);

  /** Un clic : tout remonter avec défilement fluide ; la fermeture du menu attend la fin du scroll. */
  const scrollAuditFormToTop = useCallback(() => scrollEntireLayoutToTopAsync(), []);

  const handlePhotosBack = useCallback(() => {
    setPhase("main");
  }, []);

  const uploadPhotos = async (id: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("audit-photos")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  };

  const handleFinish = async () => {
    if (!stepZeroData || !config) return;
    if (!draftIdRef.current) {
      await saveDraft();
      if (!draftIdRef.current) {
        toast.error("Impossible de sauvegarder l'audit");
        return;
      }
    }
    setPhase("saving");
    try {
      clearTimeout(saveTimerRef.current);
      let photoUrls = [...existingPhotos];
      if (photos.length > 0) {
        const newUrls = await uploadPhotos(draftIdRef.current);
        photoUrls = [...photoUrls, ...newUrls];
      }

      const { auditPayload, detailPayload, noteSur10 } = buildAuditPayloads(
        stepZeroData, answers, photoUrls, signatureAuditeur, signatureAudite
      );

      await supabase.from("audits")
        .update({ ...auditPayload, statut: 'OK' })
        .eq("id", draftIdRef.current);
      await supabase.from("audit_details")
        .update({ ...detailPayload, audit_id: draftIdRef.current })
        .eq("audit_id", draftIdRef.current);

      clearAuditDraft(draftStorageKey);

      const { data: authAfter } = await supabase.auth.getUser();
      const uid = authAfter.user?.id;
      if (uid && stepZeroData) {
        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: uid,
          title: isEditMode ? "Audit modifié et validé" : "Audit terminé",
          body: `${stepZeroData.partenaireAudite} — Note ${noteSur10}/10`,
          type: "audit_completed",
          link: "/audits",
        });
        if (notifErr) console.error("notification audit:", notifErr);
      }

      toast.success(isEditMode ? `Audit modifié — Note : ${noteSur10}/10` : `Audit enregistré — Note : ${noteSur10}/10`);

      fireAuditCompletionConfetti();
      navigate("/audits");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la finalisation de l'audit");
      setPhase("photos");
    }
  };

  if (configLoading || (isEditMode && !editLoaded)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement de la grille d'audit…</p>
        </div>
      </AppLayout>
    );
  }

  if (!config) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">
            Aucune grille d'audit configurée pour « {typeEvenement} ».
          </p>
          <button onClick={() => navigate("/audits/new")} className="text-primary underline text-sm">
            Retour
          </button>
        </div>
      </AppLayout>
    );
  }

  const categories = config.categories;
  const formTitle =
    phase === "photos"
      ? "Photos de l'audit"
      : phase === "saving"
      ? "Enregistrement..."
      : isEditMode
      ? "Modifier l'audit"
      : "Nouvel audit";
  const selectedTypeTitle = typeEvenement.startsWith("RD ")
    ? `Rencontre Dirigeants ${typeEvenement.replace(/^RD\s+/, "")}`
    : typeEvenement;
  const cleanSectionTitle = (s: string) => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  const normalizeSectionTitle = (raw: string) => {
    const cleaned = cleanSectionTitle(raw);
    const upper = cleaned.toUpperCase();
    if (upper.includes("PREPARATION") || upper.includes("PRÉPARATION")) return "Préparation";
    if (upper.includes("ANIMATION")) return "Animation";
    if (upper.includes("PROMOTION")) return "Promotion";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <SaveStatusIndicator status={saveStatus} />
      <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
        {Math.round(progress)}%
      </Badge>
    </div>
  );

  return (
    <AppLayout mainClassName="!pt-0 shell:!pt-0">
      <>
      <div className="min-w-0">
        <div className="px-0 pt-0">
        {phase === "main" && (
          <div className="space-y-8">
            <div>
              <div className="sticky top-0 z-[35] -mx-4 border-b border-border/30 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 shell:-mx-6">
                <ContextSubHeader
                  title={`${selectedTypeTitle} : Informations générales`}
                  meta={`${totalFilled} / ${totalExpected}`}
                  actions={headerActions}
                />
                <Progress
                  value={progress}
                  max={100}
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] rounded-none bg-muted"
                  aria-label={`Progression de l'audit : ${Math.round(progress)} pour cent`}
                />
              </div>
              <div className="mt-5 sm:mt-6">
                <StepZeroForm
                  key={draftStorageKey}
                  typeEvenement={typeEvenement}
                  initialData={stepZeroData}
                  onSubmit={handleStepZeroChange}
                  onChange={handleStepZeroChange}
                  hideSubmitButton
                />
              </div>
            </div>

            <div ref={itemsSectionRef} className="space-y-6">
              {categories.map((cat) => {
                const catItems = allItems.filter((i) => i.categoryId === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <div className="sticky top-0 z-[34] -mx-4 border-b border-border/30 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 shell:-mx-6">
                      <ContextSubHeader
                        title={`${selectedTypeTitle} : ${normalizeSectionTitle(cat.name)}`}
                        meta={`${totalFilled} / ${totalExpected}`}
                        actions={headerActions}
                      />
                      <Progress
                        value={progress}
                        max={100}
                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] rounded-none bg-muted"
                        aria-label={`Progression de l'audit : ${Math.round(progress)} pour cent`}
                      />
                    </div>
                    {catItems.map((item) => {
                      const globalIdx = allItems.findIndex((i) => i.id === item.id);
                      return (
                        <AuditItemCard
                          key={item.id}
                          item={item}
                          index={globalIdx}
                          categoryName={normalizeSectionTitle(cat.name)}
                          answer={answers[item.id]}
                          onChange={(ans) => handleItemChange(item.id, ans)}
                          stepZeroData={item.autoField ? stepZeroData : undefined}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Score live par catégorie ── */}
            {config && categories.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                  Résultats
                </h2>
                <div className="flex gap-3 flex-wrap mb-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1 tabular-nums">
                    Total : {Object.entries(answers).filter(([,a]) => !a.notApplicable).reduce((s, [,a]) => s + a.score, 0)} / {allItems.filter(i => !answers[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0)} pts
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1 tabular-nums">
                    Note : {(() => {
                      const appMax = allItems.filter(i => !answers[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0);
                      const appScore = Object.entries(answers).filter(([,a]) => !a.notApplicable).reduce((s, [,a]) => s + a.score, 0);
                      return appMax > 0 ? ((appScore / appMax) * 10).toFixed(1) : "—";
                    })()}/10
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const catItems = allItems.filter((i) => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    const catMaxPoints = catItems.filter(i => !answers[i.id]?.notApplicable).reduce((sum, i) => sum + i.maxPoints, 0);
                    const catObtained = catItems.filter(i => !answers[i.id]?.notApplicable).reduce((sum, i) => sum + (answers[i.id]?.score ?? 0), 0);
                    const pct = catMaxPoints > 0 ? Math.round((catObtained / catMaxPoints) * 100) : 0;
                    return (
                      <div key={cat.id} className="flex-1 min-w-[140px] rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground truncate">{cat.name}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold tabular-nums text-foreground">{catObtained}</span>
                          <span className="text-xs text-muted-foreground">/ {catMaxPoints} pts</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-muted-foreground text-right">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleGoToPhotos}
                disabled={!infoValid}
                className="w-full gap-1.5"
              >
                Continuer vers les photos
                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
              </Button>
              {!infoValid && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Remplis les champs obligatoires (*) pour continuer
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "photos" && (
          <AuditPhotoUpload
            photos={photos}
            onChange={setPhotos}
            existingPhotos={existingPhotos}
            onExistingPhotosChange={setExistingPhotos}
            onSubmit={handleFinish}
            onBack={handlePhotosBack}
            uploading={false}
            auditeurName={stepZeroData?.auditeur || ""}
            partenaireName={stepZeroData?.partenaireAudite || ""}
            signatureAuditeur={signatureAuditeur}
            onSignatureAuditeurChange={setSignatureAuditeur}
            signatureAudite={signatureAudite}
            onSignatureAuditeChange={setSignatureAudite}
          />
        )}

        {phase === "saving" && (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground animate-pulse">
              Enregistrement de l'audit en cours…
            </p>
          </div>
        )}
      </div>
      </div>

      {!isEditMode && phase === "main" && (
        <AuditCreationFabMenu
          saveDisabled={!stepZeroData}
          onSaveProgress={handleFabSaveProgress}
          onScrollTop={scrollAuditFormToTop}
          saving={saveStatus === "saving"}
        />
      )}
      </>
    </AppLayout>
  );
}
