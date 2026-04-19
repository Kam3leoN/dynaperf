import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppModules } from "@/hooks/useAppModules";

type PermissionsContextValue = {
  hasPermission: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
  loading: boolean;
  /** RPC permissions indisponible après plusieurs essais — repli `nav.admin` si rôle admin (voir AdminRoute + rail). */
  permissionFetchFailed: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { hasPermission: rawHas, loading, fetchFailed } = usePermissions(user?.id, authLoading);
  const { isModuleEnabled, loading: modulesLoading } = useAppModules(user?.id);

  const hasPermission = useCallback(
    (key: string) => {
      if (rawHas(key)) return true;
      if (fetchFailed && isAdmin && key === "nav.admin") return true;
      return false;
    },
    [rawHas, fetchFailed, isAdmin],
  );

  return (
    <PermissionsContext.Provider
      value={{
        hasPermission,
        isModuleEnabled,
        loading: loading || modulesLoading,
        permissionFetchFailed: fetchFailed,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionGate() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissionGate must be used within PermissionsProvider");
  }
  return ctx;
}

/** Version tolérante (hors provider) pour tests ou pages sans shell. */
export function useOptionalPermissionGate(): PermissionsContextValue | null {
  return useContext(PermissionsContext);
}
