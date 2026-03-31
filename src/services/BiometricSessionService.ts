/**
 * Service de gestion de session locale pour la biométrie.
 *
 * Sépare la session applicative locale du jeton de reprise biométrique afin de :
 * - déconnecter l'utilisateur de l'interface sans révoquer le jeton biométrique du device ;
 * - imposer une nouvelle authentification biométrique après fermeture complète de l'app ;
 * - faire tourner automatiquement le refresh token stocké quand la session change.
 *
 * @module BiometricSessionService
 */

const REFRESH_TOKEN_KEY = "dynaperf_webauthn_refresh_token";
const APP_UNLOCK_KEY = "dynaperf_app_runtime_unlock";

/**
 * Retourne la clé de stockage utilisée par le client d'authentification.
 */
function getSupabaseAuthStorageKey(): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  if (projectId) {
    return `sb-${projectId}-auth-token`;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const host = url ? new URL(url).hostname.split(".")[0] : "auth";
  return `sb-${host}-auth-token`;
}

/**
 * Stocke le refresh token dédié à la reconnexion biométrique.
 */
export function storeBiometricRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Lit le refresh token dédié à la reconnexion biométrique.
 */
export function getBiometricRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Supprime le refresh token biométrique local.
 */
export function clearBiometricRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Marque la session courante comme déverrouillée dans l'onglet/app en cours.
 *
 * Le sessionStorage disparaît à la fermeture complète de la webview,
 * ce qui force une nouvelle empreinte/Face ID à la prochaine ouverture.
 */
export function markAppSessionUnlocked(): void {
  sessionStorage.setItem(APP_UNLOCK_KEY, "1");
}

/**
 * Indique si la session d'exécution courante a déjà été déverrouillée.
 */
export function hasAppSessionUnlocked(): boolean {
  return sessionStorage.getItem(APP_UNLOCK_KEY) === "1";
}

/**
 * Supprime le marqueur de déverrouillage local.
 */
export function clearAppSessionUnlocked(): void {
  sessionStorage.removeItem(APP_UNLOCK_KEY);
}

/**
 * Efface uniquement la session d'authentification persistée dans l'appareil.
 *
 * Important : on ne révoque pas le refresh token biométrique dédié,
 * afin de permettre une reconnexion sécurisée par WebAuthn juste après.
 */
export function clearPersistedAuthSession(): void {
  const storageKey = getSupabaseAuthStorageKey();
  localStorage.removeItem(storageKey);
  localStorage.removeItem(`${storageKey}-code-verifier`);
}

/**
 * Verrouille l'application localement sur cet appareil.
 */
export function lockAppLocally(): void {
  clearAppSessionUnlocked();
  clearPersistedAuthSession();
}