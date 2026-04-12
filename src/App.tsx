import { useState, lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, ScrollRestoration } from "react-router-dom";
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
import { useAppBranding } from "@/hooks/useAppBranding";
import { ResponsiveShellProvider } from "@/contexts/ResponsiveShellContext";
import { PresenceStatusDefinitionsProvider } from "@/contexts/PresenceStatusDefinitionsContext";
import { prefetchPageChunksDeferred } from "@/lib/prefetchPageChunks";

// Eagerly loaded (critical path)
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";

// Lazy-loaded routes for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Registre = lazy(() => import("./pages/Registre"));
const NewAudit = lazy(() => import("./pages/NewAudit"));
const AuditVersionSelect = lazy(() => import("./pages/AuditVersionSelect"));
const AuditForm = lazy(() => import("./pages/AuditForm"));
const AdminShell = lazy(() => import("./pages/admin/AdminShell"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminModules = lazy(() => import("./components/AdminModules"));
const AdminAuditsConfig = lazy(() => import("./components/AdminAuditGrid"));
const AdminSecteursAdmin = lazy(() => import("./components/AdminSecteurs"));
const AdminUserPrimes = lazy(() => import("./pages/admin/AdminUserPrimes"));
const AdminExpression = lazy(() => import("./pages/admin/AdminExpression"));
const AdminInvitations = lazy(() => import("./pages/admin/AdminInvitations"));
const AdminBranding = lazy(() => import("./pages/admin/AdminBranding"));
const AdminBackups = lazy(() => import("./pages/admin/AdminBackups"));
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
const QrCodeManageList = lazy(() => import("./pages/QrCodeManageList"));
const QrCodeManager = lazy(() => import("./pages/QrCodeManager"));
const QrCodeShapes = lazy(() => import("./pages/QrCodeShapes"));
const AdminQrShapes = lazy(() => import("./pages/admin/AdminQrShapes"));
const AdminPresenceStatuses = lazy(() => import("./pages/admin/AdminPresenceStatuses"));
const QrCodeStats = lazy(() => import("./pages/QrCodeStats"));
const Galerie = lazy(() => import("./pages/Galerie"));
const QrScanRedirect = lazy(() => import("./pages/QrScanRedirect"));

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
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-muted-foreground text-sm">Chargement…</p>
    </div>
  );
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

function AppBrandingBoot() {
  useAppBranding();
  return null;
}

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (!splashDone) return;
    prefetchPageChunksDeferred();
  }, [splashDone]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PresenceStatusDefinitionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            <OfflineIndicator />
            {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
            {splashDone && (
            <>
            <AppBrandingBoot />
            <BrowserRouter basename={routerBase} future={{ v7_startTransition: true }}>
              <ScrollRestoration />
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
                    <Route path="/admin" element={<AdminRoute><AdminShell /></AdminRoute>}>
                      <Route index element={<Navigate to="users" replace />} />
                      <Route path="backups" element={<AdminBackups />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="modules" element={<AdminModules />} />
                      <Route path="audits-config" element={<AdminAuditsConfig />} />
                      <Route path="secteurs" element={<AdminSecteursAdmin />} />
                      <Route path="primes-users" element={<AdminUserPrimes />} />
                      <Route path="application" element={<Navigate to="/admin/modules" replace />} />
                      <Route path="roles" element={<AdminRoles />} />
                      <Route path="expression" element={<AdminExpression />} />
                      <Route path="invitations" element={<AdminInvitations />} />
                      <Route path="branding" element={<AdminBranding />} />
                      <Route path="qr-shapes" element={<AdminQrShapes />} />
                      <Route path="presence-statuses" element={<AdminPresenceStatuses />} />
                    </Route>
                    <Route path="/admin/audit-grid" element={<AdminRoute><AdminAuditGrid /></AdminRoute>} />
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
                    <Route path="/qrcodes/new" element={<PermissionRoute permission="nav.hub"><QrCodeManager /></PermissionRoute>} />
                    <Route path="/qrcodes/shapes" element={<PermissionRoute permission="nav.hub"><QrCodeShapes /></PermissionRoute>} />
                    <Route path="/qrcodes/stats" element={<PermissionRoute permission="nav.hub"><QrCodeStats /></PermissionRoute>} />
                    <Route path="/qrcodes" element={<PermissionRoute permission="nav.hub"><QrCodeManageList /></PermissionRoute>} />
                    <Route path="/galerie" element={<PermissionRoute permission="nav.audits"><Galerie /></PermissionRoute>} />
                    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                    <Route
                      path="/r/:qrId"
                      element={
                        <Suspense fallback={<FullPageLoader />}>
                          <QrScanRedirect />
                        </Suspense>
                      }
                    />
                    <Route path="/reset-password" element={<Suspense fallback={<FullPageLoader />}><ResetPassword /></Suspense>} />
                    <Route path="*" element={<Suspense fallback={<FullPageLoader />}><NotFound /></Suspense>} />
                  </Routes>
                </PermissionsProvider>
              </MessagingSidebarProvider>
              </ResponsiveShellProvider>
            </BrowserRouter>
            </>
            )}
          </TooltipProvider>
          </PresenceStatusDefinitionsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
