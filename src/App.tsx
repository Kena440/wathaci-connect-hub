import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PrivateRoute } from "./components/PrivateRoute";
import "./i18n";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Resources = lazy(() => import("./pages/Resources"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignIn = lazy(() =>
  import("./pages/SignIn").then((module) => ({ default: module.SignIn }))
);
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GetStarted = lazy(() =>
  import("./pages/GetStarted").then((module) => ({ default: module.GetStarted }))
);
const SubscriptionPlans = lazy(() =>
  import("./pages/SubscriptionPlans").then((module) => ({
    default: module.SubscriptionPlans,
  }))
);
const PartnershipHub = lazy(() =>
  import("./pages/PartnershipHub").then((module) => ({
    default: module.PartnershipHub,
  }))
);
const FundingHub = lazy(() => import("./pages/FundingHub"));
const ProfileSetup = lazy(() =>
  import("./pages/ProfileSetup").then((module) => ({ default: module.ProfileSetup }))
);
const ProfileReview = lazy(() =>
  import("./components/ProfileReview").then((module) => ({
    default: module.ProfileReview,
  }))
);
const FreelancerHub = lazy(() => import("./pages/FreelancerHub"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Messages = lazy(() => import("./pages/Messages"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const TestError = lazy(() => import("./pages/TestError"));
const SMEAssessment = lazy(() =>
  import("./pages/SMEAssessment").then((module) => ({ default: module.SMEAssessment }))
);
const InvestorAssessment = lazy(() =>
  import("./pages/InvestorAssessment").then((module) => ({
    default: module.InvestorAssessment,
  }))
);
const DonorAssessment = lazy(() =>
  import("./pages/DonorAssessment").then((module) => ({
    default: module.DonorAssessment,
  }))
);
const ProfessionalAssessment = lazy(() =>
  import("./pages/ProfessionalAssessment").then((module) => ({
    default: module.ProfessionalAssessment,
  }))
);
const GovernmentAssessment = lazy(() =>
  import("./pages/GovernmentAssessment").then((module) => ({
    default: module.GovernmentAssessment,
  }))
);

export const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/freelancer-hub" element={<FreelancerHub />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="/profile-review" element={<ProfileReview />} />
      <Route path="/subscription-plans" element={<SubscriptionPlans />} />
      <Route path="/partnership-hub" element={<PartnershipHub />} />
      <Route
        path="/funding-hub"
        element={
          <PrivateRoute>
            <FundingHub />
          </PrivateRoute>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/test-error" element={<TestError />} />
      <Route
        path="/messages"
        element={
          <PrivateRoute>
            <Messages />
          </PrivateRoute>
        }
      />
      <Route
        path="/sme-assessment"
        element={
          <PrivateRoute>
            <SMEAssessment />
          </PrivateRoute>
        }
      />
      <Route
        path="/investor-assessment"
        element={
          <PrivateRoute>
            <InvestorAssessment />
          </PrivateRoute>
        }
      />
      <Route
        path="/donor-assessment"
        element={
          <PrivateRoute>
            <DonorAssessment />
          </PrivateRoute>
        }
      />
      <Route
        path="/professional-assessment"
        element={
          <PrivateRoute>
            <ProfessionalAssessment />
          </PrivateRoute>
        }
      />
      <Route
        path="/government-assessment"
        element={
          <PrivateRoute>
            <GovernmentAssessment />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
