import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        // Use the security definer function to avoid RLS issues
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (error) {
          console.error("Admin check error:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (e) {
        console.error("Admin check failed:", e);
        setIsAdmin(false);
      }
      setLoading(false);
    };
    check();
  }, [user]);

  return { isAdmin, loading };
}
