/**
 * Service d'authentification biométrique WebAuthn (Passkeys)
 *
 * Ce service gère l'enregistrement et l'authentification via l'API WebAuthn
 * (empreinte digitale, Face ID, etc.) pour les utilisateurs de DynaPerf.
 *
 * @module WebAuthnService
 */

/** Clé de stockage local pour les identifiants WebAuthn */
const CREDENTIAL_STORAGE_KEY = "dynaperf_webauthn_credential";
const USER_ID_STORAGE_KEY = "dynaperf_webauthn_user_id";
const USER_EMAIL_STORAGE_KEY = "dynaperf_webauthn_user_email";

/**
 * Identifiant relying party (domaine de l'application)
 * En production, utiliser le domaine réel.
 */
function getRpId(): string {
  return window.location.hostname;
}

/**
 * Vérifie si le navigateur/appareil supporte l'API WebAuthn
 * @returns {Promise<boolean>} true si WebAuthn est disponible
 */
export async function isWebAuthnSupported(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    // Vérifie si l'authentificateur de plateforme (biométrique) est disponible
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Vérifie si un credential WebAuthn est déjà enregistré sur cet appareil
 * @returns {boolean} true si un credential existe en localStorage
 */
export function hasStoredCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_STORAGE_KEY);
}

/**
 * Récupère l'email de l'utilisateur associé au credential stocké
 * @returns {string | null} L'email ou null
 */
export function getStoredUserEmail(): string | null {
  return localStorage.getItem(USER_EMAIL_STORAGE_KEY);
}

/**
 * Récupère l'ID utilisateur associé au credential stocké
 * @returns {string | null} L'ID ou null
 */
export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_STORAGE_KEY);
}

/**
 * Convertit un ArrayBuffer en chaîne Base64 URL-safe
 * @param {ArrayBuffer} buffer - Le buffer à convertir
 * @returns {string} La chaîne encodée
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Convertit une chaîne Base64 URL-safe en ArrayBuffer
 * @param {string} base64url - La chaîne à décoder
 * @returns {ArrayBuffer} Le buffer résultant
 */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Génère un challenge aléatoire pour les opérations WebAuthn
 * @returns {Uint8Array} Un tableau de 32 octets aléatoires
 */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32)) as unknown as Uint8Array;
}

/**
 * Résultat de l'enregistrement WebAuthn
 */
export interface WebAuthnRegistrationResult {
  /** Identifiant du credential (base64url) */
  credentialId: string;
  /** Clé publique (base64url) */
  publicKey: string;
  /** Succès de l'opération */
  success: boolean;
}

/**
 * Enregistre un nouveau credential WebAuthn (biométrique) pour l'utilisateur.
 *
 * Cette fonction déclenche le prompt biométrique natif (empreinte / Face ID).
 * L'utilisateur doit être déjà connecté avec email/mot de passe.
 *
 * @param {string} userId - L'identifiant unique de l'utilisateur (UUID)
 * @param {string} userEmail - L'email de l'utilisateur
 * @param {string} displayName - Le nom d'affichage de l'utilisateur
 * @returns {Promise<WebAuthnRegistrationResult>} Le résultat de l'enregistrement
 * @throws {Error} Si l'utilisateur annule ou si le matériel n'est pas supporté
 */
export async function registerWebAuthnCredential(
  userId: string,
  userEmail: string,
  displayName: string
): Promise<WebAuthnRegistrationResult> {
  // Vérifie le support avant de commencer
  const supported = await isWebAuthnSupported();
  if (!supported) {
    throw new Error("L'authentification biométrique n'est pas supportée sur cet appareil.");
  }

  const challenge = generateChallenge();
  const userIdBytes = new TextEncoder().encode(userId);

  // Options de création du credential
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "DynaPerf",
      id: getRpId(),
    },
    user: {
      id: userIdBytes,
      name: userEmail,
      displayName: displayName || userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Force l'utilisation du biométrique intégré
      userVerification: "required",        // Exige la vérification de l'utilisateur
      residentKey: "preferred",
    },
    timeout: 60000, // 60 secondes pour répondre au prompt
    attestation: "none",
  };

  try {
    // Déclenche le prompt biométrique natif
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Aucun credential n'a été créé.");
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = bufferToBase64url(credential.rawId);
    const publicKey = bufferToBase64url(response.attestationObject);

    // Stocke les informations en localStorage pour les reconnexions futures
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, userEmail);

    return { credentialId, publicKey, success: true };
  } catch (error: any) {
    // Gestion spécifique de l'annulation par l'utilisateur
    if (error.name === "NotAllowedError") {
      throw new Error("L'authentification biométrique a été annulée par l'utilisateur.");
    }
    if (error.name === "InvalidStateError") {
      throw new Error("Un credential existe déjà pour cet appareil.");
    }
    throw new Error(`Erreur lors de l'enregistrement biométrique : ${error.message}`);
  }
}

/**
 * Authentifie l'utilisateur via le credential WebAuthn stocké.
 *
 * Cette fonction déclenche le prompt biométrique (empreinte / Face ID)
 * et retourne true si l'authentification réussit.
 *
 * @returns {Promise<{ success: boolean; credentialId: string }>} Résultat de l'authentification
 * @throws {Error} Si aucun credential n'est stocké ou si l'utilisateur annule
 */
export async function authenticateWithWebAuthn(): Promise<{
  success: boolean;
  credentialId: string;
}> {
  const storedCredentialId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  if (!storedCredentialId) {
    throw new Error("Aucun credential biométrique enregistré sur cet appareil.");
  }

  const supported = await isWebAuthnSupported();
  if (!supported) {
    throw new Error("L'authentification biométrique n'est pas supportée sur cet appareil.");
  }

  const challenge = generateChallenge();

  // Options d'authentification
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: getRpId(),
    allowCredentials: [
      {
        id: base64urlToBuffer(storedCredentialId),
        type: "public-key",
        transports: ["internal"], // Authentificateur de plateforme uniquement
      },
    ],
    userVerification: "required",
    timeout: 60000,
  };

  try {
    // Déclenche le prompt biométrique
    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error("L'authentification biométrique a échoué.");
    }

    const credentialId = bufferToBase64url(assertion.rawId);
    return { success: true, credentialId };
  } catch (error: any) {
    if (error.name === "NotAllowedError") {
      throw new Error("L'authentification biométrique a été annulée par l'utilisateur.");
    }
    throw new Error(`Erreur lors de l'authentification biométrique : ${error.message}`);
  }
}

/**
 * Supprime le credential WebAuthn stocké localement.
 * L'utilisateur devra se reconnecter avec email/mot de passe
 * et réenregistrer le biométrique s'il le souhaite.
 */
export function removeStoredCredential(): void {
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
}
