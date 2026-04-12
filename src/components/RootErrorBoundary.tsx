import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  isStaleChunkLoadFailure,
  purgeServiceWorkerAndCaches,
  scheduleChunkLoadRecovery,
} from "@/lib/chunkLoadRecovery";

/** Purge SW + caches puis hard-reload (secours manuel). */
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
 * Évite l’écran blanc en cas d’erreur React.
 * Les erreurs de chunk après déploiement affichent un écran neutre « mise à jour », pas une page d’erreur technique.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retrying: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, retrying: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info.componentStack);
    if (isStaleChunkLoadFailure(error.message)) {
      void scheduleChunkLoadRecovery(error);
    }
  }

  render() {
    const err = this.state.error;
    if (!err) {
      return this.props.children;
    }

    const isChunk = isStaleChunkLoadFailure(err.message);

    if (isChunk) {
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
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e2e8f0",
              borderTopColor: "#ee4540",
              borderRadius: "50%",
              animation: "dp-spin 0.8s linear infinite",
              marginBottom: 20,
            }}
          />
          <style>{`@keyframes dp-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>
            Mise à jour de l’application…
          </p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", textAlign: "center", maxWidth: 420, margin: 0 }}>
            Une nouvelle version vient d’être déployée. Le chargement reprend automatiquement. Si rien ne change,
            désinscrivez le service worker : ajoutez{" "}
            <code style={{ fontSize: "0.8rem" }}>?dp-sw-reset=1</code> à l’URL puis Entrée.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ retrying: true });
              void purgeAndReload();
            }}
            disabled={this.state.retrying}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {this.state.retrying ? "Actualisation…" : "Purger le cache & recharger"}
          </button>
        </div>
      );
    }

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
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
          Un problème est survenu
        </p>
        <p style={{ color: "#64748b", textAlign: "center", maxWidth: 420, marginBottom: 24 }}>
          Tu peux recharger la page. Si cela se répète, contacte le support.
        </p>
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
}
