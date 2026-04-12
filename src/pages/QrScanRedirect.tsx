import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Route publique : appelle le RPC de suivi puis redirige vers la cible enregistrée.
 */
export default function QrScanRedirect() {
  const { qrId } = useParams<{ qrId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Redirection…");

  useEffect(() => {
    if (!qrId || !/^[0-9a-f-]{36}$/i.test(qrId)) {
      setMessage("Lien invalide.");
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.rpc("qr_resolve_and_track", { p_id: qrId });
      if (cancelled) return;
      if (error) {
        setMessage(`Erreur : ${error.message}`);
        return;
      }
      const target = data != null && typeof data === "string" ? data : "";
      if (!target.trim()) {
        setMessage("QR code introuvable.");
        return;
      }
      const t = target.trim();
      try {
        if (/^(https?:|mailto:|tel:|sms:|geo:)/i.test(t)) {
          window.location.replace(t);
          return;
        }
        if (t.startsWith("/")) {
          window.location.replace(t);
          return;
        }
        window.location.replace(`https://${t}`);
      } catch {
        setMessage("Impossible d’ouvrir la cible.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qrId]);

  useEffect(() => {
    if (message.startsWith("QR code") || message.startsWith("Lien")) {
      const t = window.setTimeout(() => navigate("/", { replace: true }), 4000);
      return () => window.clearTimeout(t);
    }
  }, [message, navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}
