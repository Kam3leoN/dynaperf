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
  if (loading || adminLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
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
              <MessagingSidebarProvider>
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
                <Route path="/drive" element={<ProtectedRoute><Drive /></ProtectedRoute>} />
                <Route path="/activite/dashboard" element={<ProtectedRoute><SuiviActiviteDashboard /></ProtectedRoute>} />
                <Route path="/activite/:id" element={<ProtectedRoute><SuiviActiviteDetail /></ProtectedRoute>} />
                <Route path="/activite" element={<ProtectedRoute><SuiviActiviteList /></ProtectedRoute>} />
                <Route path="/activite/new/version" element={<ProtectedRoute><SuiviActiviteVersionSelect /></ProtectedRoute>} />
                <Route path="/activite/new" element={<ProtectedRoute><SuiviActiviteForm /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route path="/reseau" element={<ProtectedRoute><Reseau /></ProtectedRoute>} />
                <Route path="/reseau/partenaires" element={<ProtectedRoute><Partenaires /></ProtectedRoute>} />
                <Route path="/reseau/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
                <Route path="/reseau/secteurs" element={<ProtectedRoute><Secteurs /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/sondages" element={<ProtectedRoute><Sondages /></ProtectedRoute>} />
                <Route path="/historique" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
                <Route path="/hub" element={<ProtectedRoute><DashboardHub /></ProtectedRoute>} />
                <Route path="/primes" element={<ProtectedRoute><Primes /></ProtectedRoute>} />
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/reset-password" element={<Suspense fallback={<FullPageLoader />}><ResetPassword /></Suspense>} />
                <Route path="*" element={<Suspense fallback={<FullPageLoader />}><NotFound /></Suspense>} />
              </Routes>
              </MessagingSidebarProvider>
            </BrowserRouter>
            )}
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
