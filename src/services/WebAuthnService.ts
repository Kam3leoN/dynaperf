/**
 * Service d'authentification biométrique WebAuthn (Passkeys)
 *
 * Ce service gère l'enregistrement et l'authentification via l'API WebAuthn
 * (empreinte digitale, Face ID, etc.) pour les utilisateurs de DynaPerf.
 *
 * Après un login classique réussi, le refresh_token Supabase est stocké
 * localement. Lors d'une reconnexion biométrique, ce token est utilisé
 * pour restaurer la session sans re-saisir le mot de passe.
 *
 * @module WebAuthnService
 */

/** Clés de stockage local */
const CREDENTIAL_STORAGE_KEY = "dynaperf_webauthn_credential";
const USER_ID_STORAGE_KEY = "dynaperf_webauthn_user_id";
const USER_EMAIL_STORAGE_KEY = "dynaperf_webauthn_user_email";
const REFRESH_TOKEN_KEY = "dynaperf_webauthn_refresh_token";

/**
 * Identifiant relying party (domaine de l'application)
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
    // Check platform authenticator (fingerprint, Face ID, Windows Hello)
    const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (platform) return true;
    // Fallback: on desktop, conditional mediation (passkeys via browser/OS) may still work
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === "function") {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
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
 * Stocke le refresh_token Supabase après un login réussi.
 * Ce token sera utilisé pour restaurer la session après validation biométrique.
 * @param {string} refreshToken - Le refresh_token de la session Supabase
 */
export function storeRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Récupère le refresh_token stocké
 * @returns {string | null} Le refresh_token ou null
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Convertit un ArrayBuffer en chaîne Base64 URL-safe */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Convertit une chaîne Base64 URL-safe en ArrayBuffer */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Génère un challenge aléatoire pour les opérations WebAuthn */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32)) as unknown as Uint8Array;
}

export interface WebAuthnRegistrationResult {
  credentialId: string;
  publicKey: string;
  success: boolean;
}

/**
 * Enregistre un nouveau credential WebAuthn (biométrique) pour l'utilisateur.
 * L'utilisateur doit être déjà connecté avec email/mot de passe.
 *
 * @param {string} userId - L'identifiant unique de l'utilisateur (UUID)
 * @param {string} userEmail - L'email de l'utilisateur
 * @param {string} displayName - Le nom d'affichage de l'utilisateur
 * @returns {Promise<WebAuthnRegistrationResult>} Le résultat de l'enregistrement
 */
export async function registerWebAuthnCredential(
  userId: string,
  userEmail: string,
  displayName: string
): Promise<WebAuthnRegistrationResult> {
  const supported = await isWebAuthnSupported();
  if (!supported) {
    throw new Error("L'authentification biométrique n'est pas supportée sur cet appareil.");
  }

  const challenge = generateChallenge();
  const userIdBytes = new TextEncoder().encode(userId);

  const baseOptions: Omit<PublicKeyCredentialCreationOptions, "authenticatorSelection"> = {
    challenge: challenge as BufferSource,
    rp: { name: "DynaPerf", id: getRpId() },
    user: {
      id: userIdBytes as BufferSource,
      name: userEmail,
      displayName: displayName || userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      { alg: -257, type: "public-key" },
    ],
    timeout: 90000,
    attestation: "none",
  };

  const platformFirstOptions: PublicKeyCredentialCreationOptions = {
    ...baseOptions,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  };

  const fallbackOptions: PublicKeyCredentialCreationOptions = {
    ...baseOptions,
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
  };

  try {
    let credential: PublicKeyCredential | null = null;

    try {
      credential = (await navigator.credentials.create({
        publicKey: platformFirstOptions,
      })) as PublicKeyCredential | null;
    } catch (firstError: unknown) {
      const n = firstError instanceof Error ? firstError.name : "";
      const shouldRetry = ["NotAllowedError", "ConstraintError", "NotSupportedError"].includes(n);
      if (!shouldRetry) throw firstError;

      credential = (await navigator.credentials.create({
        publicKey: fallbackOptions,
      })) as PublicKeyCredential | null;
    }

    if (!credential) {
      throw new Error("Aucun credential n'a été créé.");
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = bufferToBase64url(credential.rawId);
    const publicKey = bufferToBase64url(response.attestationObject);

    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, userEmail);

    return { credentialId, publicKey, success: true };
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "";
    if (name === "NotAllowedError") {
      if (window.top !== window.self) {
        throw new Error("Windows Hello est bloqué dans la prévisualisation intégrée. Ouvrez l'app dans un onglet direct puis réessayez.");
      }
      throw new Error("Validation Windows Hello non confirmée. Vérifiez que la fenêtre est active puis réessayez.");
    }
    if (name === "InvalidStateError") {
      throw new Error("Un credential existe déjà pour cet appareil.");
    }
    if (name === "SecurityError") {
      throw new Error("Contexte de sécurité invalide pour la biométrie. Utilisez l'URL sécurisée de l'application.");
    }
    throw new Error(`Erreur lors de l'enregistrement biométrique : ${message}`);
  }
}

/**
 * Authentifie l'utilisateur via le credential WebAuthn stocké.
 * Déclenche le prompt biométrique (empreinte / Face ID).
 *
 * @returns {Promise<{ success: boolean; credentialId: string }>}
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

  const strictRequest: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    rpId: getRpId(),
    allowCredentials: [
      {
        id: base64urlToBuffer(storedCredentialId),
        type: "public-key",
        transports: ["internal", "hybrid", "usb", "ble", "nfc"],
      },
    ],
    userVerification: "required",
    timeout: 60000,
  };

  const fallbackRequest: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    rpId: getRpId(),
    userVerification: "preferred",
    timeout: 60000,
  };

  try {
    let assertion: PublicKeyCredential | null = null;

    try {
      assertion = (await navigator.credentials.get({
        publicKey: strictRequest,
      })) as PublicKeyCredential | null;
    } catch (firstError: unknown) {
      const n = firstError instanceof Error ? firstError.name : "";
      const shouldRetry = ["NotAllowedError", "ConstraintError"].includes(n);
      if (!shouldRetry) throw firstError;

      assertion = (await navigator.credentials.get({
        publicKey: fallbackRequest,
      })) as PublicKeyCredential | null;
    }

    if (!assertion) {
      throw new Error("L'authentification biométrique a échoué.");
    }

    const credentialId = bufferToBase64url(assertion.rawId);
    return { success: true, credentialId };
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "";
    if (name === "NotAllowedError") {
      throw new Error("Authentification biométrique non confirmée.");
    }
    throw new Error(`Erreur lors de l'authentification biométrique : ${message}`);
  }
}

/**
 * Supprime le credential WebAuthn stocké localement.
 * Ne supprime PAS le refresh_token pour permettre une ré-activation.
 */
export function removeStoredCredential(): void {
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
