import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";

/**
 * Layout administration : sous-navigation dans la colonne secondaire — voir `appNavigation` (section admin).
 * Les sauvegardes (super_admin) : route `/admin/backups`.
 */
export default function AdminShell() {
  return (
    <AppLayout>
      <div className="app-page-shell-wide flex min-w-0 w-full max-w-full flex-col gap-4">
        <main className="min-w-0 w-full flex-1 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </AppLayout>
  );
}
