import { Component, type ErrorInfo, type ReactNode } from "react";

/** Purge SW + caches then hard-reload */
async function purgeAndReload() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* best-effort */
  }
  window.location.reload();
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  );
}

interface Props {
  children: ReactNode;
}

interface State { error: Error | null; retrying: boolean }

/**
 * Évite l’écran blanc en cas d’erreur React : affiche un message et permet de recharger.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retrying: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, retrying: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info.componentStack);
    if (isChunkLoadError(error)) {
      const key = "chunk_reload_ts";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(key, String(Date.now()));
        purgeAndReload();
      }
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#0f172a",
            color: "#f8fafc",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: 12 }}>Une erreur a interrompu l’affichage</h1>
          <p style={{ color: "#94a3b8", textAlign: "center", maxWidth: 420, marginBottom: 20 }}>
            Recharge la page ou vide le cache / désactive le service worker si le problème persiste après une mise en ligne.
          </p>
          {this.state.error?.message && (
            <pre
              style={{
                fontSize: 12,
                color: "#fca5a5",
                maxWidth: "90vw",
                overflow: "auto",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => {
              this.setState({ retrying: true });
              purgeAndReload();
            }}
            disabled={this.state.retrying}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#ee4540",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {this.state.retrying ? "Rechargement…" : "Recharger"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
