import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppModules } from "@/hooks/useAppModules";

type PermissionsContextValue = {
  hasPermission: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
  loading: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading } = usePermissions(user?.id, authLoading);
  const { isModuleEnabled, loading: modulesLoading } = useAppModules(user?.id);

  return (
    <PermissionsContext.Provider value={{ hasPermission, isModuleEnabled, loading: loading || modulesLoading }}>{children}</PermissionsContext.Provider>
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
