import type { StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import type { ItemAnswer } from "@/components/audit-stepper/AuditItemCard";

const PREFIX = "dynaperf_audit_draft_v1:";

export function buildAuditDraftStorageKey(typeEvenement: string, typeId: string): string {
  return `${PREFIX}${encodeURIComponent(typeEvenement)}:${typeId || "default"}`;
}

export interface AuditDraftSnapshot {
  stepZeroData: StepZeroData;
  answers: Record<string, ItemAnswer>;
  signatureAuditeur: string | null;
  signatureAudite: string | null;
  savedAt: string;
}

/** Sérialise StepZeroData (Date → ISO). */
export function serializeStepZeroData(data: StepZeroData): Record<string, unknown> {
  return {
    ...data,
    dateEvenement: data.dateEvenement ? data.dateEvenement.toISOString() : null,
  };
}

/** Restaure StepZeroData depuis le stockage. */
export function parseStepZeroData(raw: unknown): StepZeroData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const dateRaw = o.dateEvenement;
  let dateEvenement: Date | undefined;
  if (dateRaw === null || dateRaw === undefined || dateRaw === "") {
    dateEvenement = undefined;
  } else if (typeof dateRaw === "string") {
    const d = new Date(dateRaw);
    dateEvenement = Number.isNaN(d.getTime()) ? undefined : d;
  }
  return {
    partenaireAudite: String(o.partenaireAudite ?? ""),
    partenaireReferent: String(o.partenaireReferent ?? ""),
    auditeur: String(o.auditeur ?? ""),
    lieu: String(o.lieu ?? ""),
    typeLieu: String(o.typeLieu ?? ""),
    dateEvenement,
    heureEvenement: String(o.heureEvenement ?? ""),
    qualiteLieu: typeof o.qualiteLieu === "number" ? o.qualiteLieu : undefined,
    heureDebutPrevue: o.heureDebutPrevue !== undefined ? String(o.heureDebutPrevue) : undefined,
    heureFinPrevue: o.heureFinPrevue !== undefined ? String(o.heureFinPrevue) : undefined,
    heureDebutReelle: o.heureDebutReelle !== undefined ? String(o.heureDebutReelle) : undefined,
    heureFinReelle: o.heureFinReelle !== undefined ? String(o.heureFinReelle) : undefined,
    nomClub: o.nomClub !== undefined && o.nomClub !== null ? String(o.nomClub) : undefined,
    nbAdherents: typeof o.nbAdherents === "number" ? o.nbAdherents : undefined,
    nbInvites: typeof o.nbInvites === "number" ? o.nbInvites : undefined,
    nbNoShow: typeof o.nbNoShow === "number" ? o.nbNoShow : undefined,
    nbParticipants: typeof o.nbParticipants === "number" ? o.nbParticipants : undefined,
    nbRdvPris: typeof o.nbRdvPris === "number" ? o.nbRdvPris : undefined,
    customFieldValues:
      o.customFieldValues && typeof o.customFieldValues === "object"
        ? { ...(o.customFieldValues as Record<string, unknown>) }
        : {},
  };
}

export function loadAuditDraft(key: string): AuditDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const stepZero = parseStepZeroData(parsed.stepZeroData);
    if (!stepZero) return null;
    const answers = (parsed.answers && typeof parsed.answers === "object"
      ? parsed.answers
      : {}) as Record<string, ItemAnswer>;
    return {
      stepZeroData: stepZero,
      answers,
      signatureAuditeur:
        typeof parsed.signatureAuditeur === "string" ? parsed.signatureAuditeur : null,
      signatureAudite: typeof parsed.signatureAudite === "string" ? parsed.signatureAudite : null,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** True si l’utilisateur a commencé à remplir (évite d’écrire un JSON vide en boucle). */
export function draftHasContent(snapshot: Omit<AuditDraftSnapshot, "savedAt">): boolean {
  const z = snapshot.stepZeroData;
  const cv = z.customFieldValues ?? {};
  const hasCustom = Object.values(cv).some(
    (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  const hasLegacy =
    !!z.partenaireAudite?.trim() ||
    !!z.partenaireReferent?.trim() ||
    !!z.auditeur?.trim() ||
    !!z.lieu?.trim() ||
    !!z.typeLieu?.trim() ||
    !!z.heureEvenement?.trim() ||
    z.dateEvenement != null;
  const hasAnswers = Object.keys(snapshot.answers).length > 0;
  const hasSig = !!(snapshot.signatureAuditeur || snapshot.signatureAudite);
  return hasCustom || hasLegacy || hasAnswers || hasSig;
}

export function clearAuditDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function emptyStepZero(): StepZeroData {
  return {
    partenaireAudite: "",
    partenaireReferent: "",
    auditeur: "",
    lieu: "",
    typeLieu: "",
    dateEvenement: undefined,
    heureEvenement: "",
    qualiteLieu: 0,
    customFieldValues: {},
  };
}

/**
 * Prépare le JSON à stocker, ou `null` s’il n’y a rien à persister.
 */
export function buildPersistableDraftJson(
  stepZeroData: StepZeroData | undefined,
  answers: Record<string, ItemAnswer>,
  signatureAuditeur: string | null,
  signatureAudite: string | null,
): string | null {
  const base = stepZeroData ?? emptyStepZero();
  const candidate: Omit<AuditDraftSnapshot, "savedAt"> = {
    stepZeroData: base,
    answers,
    signatureAuditeur,
    signatureAudite,
  };
  if (!draftHasContent(candidate)) return null;
  return JSON.stringify({
    stepZeroData: serializeStepZeroData(base),
    answers,
    signatureAuditeur,
    signatureAudite,
    savedAt: new Date().toISOString(),
  });
}
