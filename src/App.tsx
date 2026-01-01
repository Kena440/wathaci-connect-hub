import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { GetStarted } from "./pages/GetStarted";
import { SubscriptionPlans } from "./pages/SubscriptionPlans";
import { PartnershipHub } from "./pages/PartnershipHub";
import { ProfileSetup } from "./pages/ProfileSetup";
import { ProfileReview } from "./components/ProfileReview";
import FreelancerHub from "./pages/FreelancerHub";
import FundingHub from "./pages/FundingHub";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AboutUs from "./pages/AboutUs";
import Messages from "./pages/Messages";
import Wallet from "./pages/Wallet";
import Donate from "./pages/Donate";
import Install from "./pages/Install";
import OnboardingProfile from "./pages/OnboardingProfile";
import PublicProfile from "./pages/PublicProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManager from "./pages/admin/UsersManager";
import RolesManager from "./pages/admin/RolesManager";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/marketplace" element={<Marketplace />} />
    <Route path="/freelancer-hub" element={<FreelancerHub />} />
    <Route path="/funding-hub" element={<FundingHub />} />
    <Route path="/resources" element={<Resources />} />
    <Route path="/get-started" element={<GetStarted />} />
    <Route path="/profile-setup" element={
      <ProtectedRoute>
        <ProfileSetup />
      </ProtectedRoute>
    } />
    <Route path="/profile-review" element={
      <ProtectedRoute>
        <ProfileReview />
      </ProtectedRoute>
    } />
    <Route path="/onboarding/profile" element={
      <ProtectedRoute>
        <OnboardingProfile />
      </ProtectedRoute>
    } />
    <Route path="/profile/:id" element={<PublicProfile />} />
    <Route path="/subscription-plans" element={<SubscriptionPlans />} />
    <Route path="/partnership-hub" element={<PartnershipHub />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-of-service" element={<TermsOfService />} />
    <Route path="/about-us" element={<AboutUs />} />
    <Route path="/messages" element={
      <ProtectedRoute>
        <Messages />
      </ProtectedRoute>
    } />
    <Route path="/wallet" element={
      <ProtectedRoute>
        <Wallet />
      </ProtectedRoute>
    } />
    <Route path="/donate" element={<Donate />} />
    <Route path="/install" element={<Install />} />
    {/* Admin Routes */}
    <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
    <Route path="/admin/users" element={<AdminGuard><UsersManager /></AdminGuard>} />
    <Route path="/admin/roles" element={<AdminGuard><RolesManager /></AdminGuard>} />
    <Route path="/admin/audit-logs" element={<AdminGuard><AuditLogs /></AdminGuard>} />
    <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <HelmetProvider>
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppProvider>
            <BrowserRouter>
              <AuthProvider>
                <OnboardingGuard>
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </OnboardingGuard>
              </AuthProvider>
            </BrowserRouter>
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
