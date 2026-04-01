import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { SplashScreen } from "@/components/SplashScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Registre from "./pages/Registre";
import NewAudit from "./pages/NewAudit";
import AuditVersionSelect from "./pages/AuditVersionSelect";
import AuditForm from "./pages/AuditForm";
import Admin from "./pages/Admin";
import AdminAuditGrid from "./pages/AdminAuditGrid";
import BusinessPlan from "./pages/BusinessPlan";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import SuiviActiviteList from "./pages/SuiviActiviteList";
import SuiviActiviteForm from "./pages/SuiviActiviteForm";
import SuiviActiviteVersionSelect from "./pages/SuiviActiviteVersionSelect";
import SuiviActiviteDashboard from "./pages/SuiviActiviteDashboard";
import SuiviActiviteDetail from "./pages/SuiviActiviteDetail";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import Reseau from "./pages/Reseau";
import Partenaires from "./pages/Partenaires";
import Clubs from "./pages/Clubs";
import Secteurs from "./pages/Secteurs";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import ActivityLog from "./pages/ActivityLog";
import Preferences from "./pages/Preferences";
import DashboardHub from "./pages/DashboardHub";

const queryClient = new QueryClient();

function FullPageLoader() {
  return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement…</p></div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user);
  if (loading || adminLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            <OfflineIndicator />
            {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
            {splashDone && (
            <BrowserRouter basename={routerBase}>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/audits" element={<ProtectedRoute><Registre /></ProtectedRoute>} />
                <Route path="/audits/new" element={<ProtectedRoute><NewAudit /></ProtectedRoute>} />
                <Route path="/audits/new/version" element={<ProtectedRoute><AuditVersionSelect /></ProtectedRoute>} />
                <Route path="/audits/new/form" element={<ProtectedRoute><AuditForm /></ProtectedRoute>} />
                <Route path="/audits/edit/:auditId" element={<ProtectedRoute><AuditForm /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/admin/audit-grid" element={<AdminRoute><AdminAuditGrid /></AdminRoute>} />
                <Route path="/business-plan" element={<ProtectedRoute><BusinessPlan /></ProtectedRoute>} />
                <Route path="/activite/dashboard" element={<ProtectedRoute><SuiviActiviteDashboard /></ProtectedRoute>} />
                <Route path="/activite/:id" element={<ProtectedRoute><SuiviActiviteDetail /></ProtectedRoute>} />
                <Route path="/activite" element={<ProtectedRoute><SuiviActiviteList /></ProtectedRoute>} />
                <Route path="/activite/new" element={<ProtectedRoute><SuiviActiviteForm /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route path="/reseau" element={<ProtectedRoute><Reseau /></ProtectedRoute>} />
                <Route path="/reseau/partenaires" element={<ProtectedRoute><Partenaires /></ProtectedRoute>} />
                <Route path="/reseau/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
                <Route path="/reseau/secteurs" element={<ProtectedRoute><Secteurs /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/historique" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
                <Route path="/hub" element={<ProtectedRoute><DashboardHub /></ProtectedRoute>} />
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            )}
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
