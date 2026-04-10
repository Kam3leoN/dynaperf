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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
      setIsSuperAdmin(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    const check = async () => {
      try {
        const { data: roleRows, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (cancelled) return;

        if (error) {
          console.error("Admin check error:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        } else {
          const roles = roleRows?.map((r) => r.role) ?? [];
          setIsSuperAdmin(roles.includes("super_admin"));
          setIsAdmin(roles.includes("super_admin") || roles.includes("admin"));
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Admin check failed:", e);
          setIsAdmin(false);
          setIsSuperAdmin(false);
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
  }, [authLoading, user]);

  return { isAdmin, isSuperAdmin, loading };
}
