import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { GetStarted } from "./pages/GetStarted";
import { SubscriptionPlans } from "./pages/SubscriptionPlans";
import { PartnershipHub } from "./pages/PartnershipHub";
import { ProfileSetup } from "./pages/ProfileSetup";
import { ProfileReview } from "./components/ProfileReview";
import FreelancerHub from "./pages/FreelancerHub";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Messages from "./pages/Messages";
import Wallet from "./pages/Wallet";

const queryClient = new QueryClient();

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/marketplace" element={<Marketplace />} />
    <Route path="/freelancer-hub" element={<FreelancerHub />} />
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
    <Route path="/subscription-plans" element={<SubscriptionPlans />} />
    <Route path="/partnership-hub" element={<PartnershipHub />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-of-service" element={<TermsOfService />} />
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
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;