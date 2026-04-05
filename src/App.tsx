import { useState, lazy, Suspense } from "react";
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
import { MessagingSidebarProvider } from "@/contexts/MessagingSidebarContext";
import { PermissionsProvider, usePermissionGate } from "@/contexts/PermissionsContext";
import { ResponsiveShellProvider } from "@/contexts/ResponsiveShellContext";

// Eagerly loaded (critical path)
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";

// Lazy-loaded routes for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Registre = lazy(() => import("./pages/Registre"));
const NewAudit = lazy(() => import("./pages/NewAudit"));
const AuditVersionSelect = lazy(() => import("./pages/AuditVersionSelect"));
const AuditForm = lazy(() => import("./pages/AuditForm"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminAuditGrid = lazy(() => import("./pages/AdminAuditGrid"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));
const BusinessPlan = lazy(() => import("./pages/BusinessPlan"));
const Drive = lazy(() => import("./pages/Drive"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SuiviActiviteList = lazy(() => import("./pages/SuiviActiviteList"));
const SuiviActiviteForm = lazy(() => import("./pages/SuiviActiviteForm"));
const SuiviActiviteVersionSelect = lazy(() => import("./pages/SuiviActiviteVersionSelect"));
const SuiviActiviteDashboard = lazy(() => import("./pages/SuiviActiviteDashboard"));
const SuiviActiviteDetail = lazy(() => import("./pages/SuiviActiviteDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Reseau = lazy(() => import("./pages/Reseau"));
const Partenaires = lazy(() => import("./pages/Partenaires"));
const Clubs = lazy(() => import("./pages/Clubs"));
const Secteurs = lazy(() => import("./pages/Secteurs"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const Sondages = lazy(() => import("./pages/Sondages"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const Preferences = lazy(() => import("./pages/Preferences"));
const DashboardHub = lazy(() => import("./pages/DashboardHub"));
const Primes = lazy(() => import("./pages/Primes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — reduce refetches
      gcTime: 30 * 60 * 1000,          // 30 min — keep in memory longer
      refetchOnWindowFocus: false,      // avoid unnecessary network calls
      retry: 1,
    },
  },
});

function FullPageLoader() {
  return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement…</p></div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user);
  const { hasPermission, loading: permLoading } = usePermissionGate();
  if (loading || adminLoading || permLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin || !hasPermission("nav.admin")) return <Navigate to="/" replace />;
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissionGate();
  if (loading || permLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
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
              <ResponsiveShellProvider>
              <MessagingSidebarProvider>
                <PermissionsProvider>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<PermissionRoute permission="nav.audits"><Index /></PermissionRoute>} />
                    <Route path="/audits" element={<PermissionRoute permission="nav.audits"><Registre /></PermissionRoute>} />
                    <Route path="/audits/new" element={<PermissionRoute permission="nav.audits"><NewAudit /></PermissionRoute>} />
                    <Route path="/audits/new/version" element={<PermissionRoute permission="nav.audits"><AuditVersionSelect /></PermissionRoute>} />
                    <Route path="/audits/new/form" element={<PermissionRoute permission="nav.audits"><AuditForm /></PermissionRoute>} />
                    <Route path="/audits/edit/:auditId" element={<PermissionRoute permission="nav.audits"><AuditForm /></PermissionRoute>} />
                    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                    <Route path="/admin/audit-grid" element={<AdminRoute><AdminAuditGrid /></AdminRoute>} />
                    <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
                    <Route path="/business-plan" element={<PermissionRoute permission="nav.reseau"><BusinessPlan /></PermissionRoute>} />
                    <Route path="/drive" element={<PermissionRoute permission="nav.drive"><Drive /></PermissionRoute>} />
                    <Route path="/activite/dashboard" element={<PermissionRoute permission="nav.activite"><SuiviActiviteDashboard /></PermissionRoute>} />
                    <Route path="/activite/:id" element={<PermissionRoute permission="nav.activite"><SuiviActiviteDetail /></PermissionRoute>} />
                    <Route path="/activite" element={<PermissionRoute permission="nav.activite"><SuiviActiviteList /></PermissionRoute>} />
                    <Route path="/activite/new/version" element={<PermissionRoute permission="nav.activite"><SuiviActiviteVersionSelect /></PermissionRoute>} />
                    <Route path="/activite/new" element={<PermissionRoute permission="nav.activite"><SuiviActiviteForm /></PermissionRoute>} />
                    <Route path="/profile" element={<PermissionRoute permission="nav.hub"><Profile /></PermissionRoute>} />
                    <Route path="/change-password" element={<PermissionRoute permission="nav.hub"><ChangePassword /></PermissionRoute>} />
                    <Route path="/reseau" element={<PermissionRoute permission="nav.reseau"><Reseau /></PermissionRoute>} />
                    <Route path="/reseau/partenaires" element={<PermissionRoute permission="nav.reseau"><Partenaires /></PermissionRoute>} />
                    <Route path="/reseau/clubs" element={<PermissionRoute permission="nav.reseau"><Clubs /></PermissionRoute>} />
                    <Route path="/reseau/secteurs" element={<PermissionRoute permission="nav.reseau"><Secteurs /></PermissionRoute>} />
                    <Route path="/notifications" element={<PermissionRoute permission="nav.hub"><Notifications /></PermissionRoute>} />
                    <Route path="/messages" element={<PermissionRoute permission="nav.messages"><Messages /></PermissionRoute>} />
                    <Route path="/sondages" element={<PermissionRoute permission="nav.sondages"><Sondages /></PermissionRoute>} />
                    <Route path="/historique" element={<PermissionRoute permission="nav.historique"><ActivityLog /></PermissionRoute>} />
                    <Route path="/preferences" element={<PermissionRoute permission="nav.hub"><Preferences /></PermissionRoute>} />
                    <Route path="/hub" element={<PermissionRoute permission="nav.hub"><DashboardHub /></PermissionRoute>} />
                    <Route path="/primes" element={<PermissionRoute permission="nav.hub"><Primes /></PermissionRoute>} />
                    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                    <Route path="/reset-password" element={<Suspense fallback={<FullPageLoader />}><ResetPassword /></Suspense>} />
                    <Route path="*" element={<Suspense fallback={<FullPageLoader />}><NotFound /></Suspense>} />
                  </Routes>
                </PermissionsProvider>
              </MessagingSidebarProvider>
              </ResponsiveShellProvider>
            </BrowserRouter>
            )}
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
