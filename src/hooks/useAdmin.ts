import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin(providedUser?: User | null) {
  const auth = useAuth();
  const usesProvidedUser = providedUser !== undefined;
  const user = usesProvidedUser ? providedUser : auth.user;
  const authLoading = usesProvidedUser ? false : auth.loading;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    const check = async () => {
      try {
        // Check for admin role (has_role now handles super_admin → admin mapping)
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin" as any,
        });

        if (cancelled) return;

        if (error) {
          console.error("Admin check error:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Admin check failed:", e);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return { isAdmin, loading };
}
