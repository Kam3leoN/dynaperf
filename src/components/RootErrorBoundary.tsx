import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Évite l’écran blanc en cas d’erreur React : affiche un message et permet de recharger.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info.componentStack);
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
          <button
            type="button"
            onClick={() => window.location.reload()}
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
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
