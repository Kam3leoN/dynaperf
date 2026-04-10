import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  isStaleChunkLoadFailure,
  purgeServiceWorkerAndCaches,
  scheduleChunkLoadRecovery,
} from "@/lib/chunkLoadRecovery";

/** Purge SW + caches puis hard-reload (bouton manuel). */
async function purgeAndReload() {
  await purgeServiceWorkerAndCaches();
  window.location.reload();
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  retrying: boolean;
}

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
    if (isStaleChunkLoadFailure(error.message)) {
      scheduleChunkLoadRecovery(error);
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
            Après une mise en ligne, un rechargement purge souvent le cache. Si le problème continue, utilise le bouton
            ci-dessous (vide le cache du site).
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
              void purgeAndReload();
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
