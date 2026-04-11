import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";

/**
 * Layout administration : navigation et sauvegardes dans la colonne secondaire (à droite du rail),
 * comme les autres sections — voir `appNavigation` (section admin) et `AppSecondaryNav`.
 */
export default function AdminShell() {
  return (
    <AppLayout>
      <div className="app-page-shell flex min-w-0 w-full max-w-full flex-col gap-4">
        <main className="min-w-0 w-full flex-1 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </AppLayout>
  );
}
