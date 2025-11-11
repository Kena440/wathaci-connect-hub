import { Suspense, lazy, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PrivateRoute } from "./components/PrivateRoute";
import { ConfigurationError } from "@/components/ConfigurationError";
import { RouteChangeDebugger } from "@/components/RouteChangeDebugger";
import { supabaseConfigStatus } from "@/config/appConfig";
import { getPaymentConfig } from "@/lib/payment-config";
import "./i18n";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Resources = lazy(() => import("./pages/Resources"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignIn = lazy(() =>
  import("./pages/SignIn").then((module) => ({ default: module.SignIn }))
);
const SignUp = lazy(() =>
  import("./pages/SignUp").then((module) => ({ default: module.SignUp }))
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
      <Route path="/signup" element={<SignUp />} />
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
    <InnerApp />
  </ThemeProvider>
);

const InnerApp = () => {
  const paymentConfigSnapshot = useMemo(() => {
    const config = getPaymentConfig();
    const fatalIssues: string[] = [];
    const warnings: string[] = [];

    const isRuntimeProd = import.meta.env.PROD || config.environment === "production";

    if (!config.sources?.publicKey) {
      const message = "Lenco public key is not configured. Set VITE_LENCO_PUBLIC_KEY (alias: LENCO_PUBLIC_KEY).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    }

    if (!config.sources?.apiUrl) {
      const message = "Lenco API URL is not configured. Set VITE_LENCO_API_URL (alias: LENCO_API_URL).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    }

    if (config.environment === "production" && config.publicKey.startsWith("pk_test_")) {
      fatalIssues.push("Production environment is configured with a test Lenco public key (pk_test_...).");
    }

    if (!config.sources?.webhookUrl) {
      const message = "Lenco webhook URL is not configured. Set VITE_LENCO_WEBHOOK_URL (alias: LENCO_WEBHOOK_URL).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    } else if (!/^https:\/\//i.test(config.webhookUrl)) {
      warnings.push("Lenco webhook URL must be HTTPS.");
    }

    return { config, fatalIssues, warnings } as const;
  }, []);

  useEffect(() => {
    console.info("[app] Mounted", {
      mode: import.meta.env.MODE,
      supabaseConfigured: supabaseConfigStatus.hasValidConfig,
      paymentPublicKeyConfigured: Boolean(paymentConfigSnapshot.config.sources?.publicKey),
      paymentWebhookConfigured: Boolean(paymentConfigSnapshot.config.sources?.webhookUrl),
    });

    return () => {
      console.info("[app] Unmounted");
    };
  }, [paymentConfigSnapshot]);

  const shouldBlockRender =
    !supabaseConfigStatus.hasValidConfig || paymentConfigSnapshot.fatalIssues.length > 0;

  if (shouldBlockRender) {
    return (
      <ConfigurationError
        supabaseStatus={supabaseConfigStatus}
        paymentStatus={paymentConfigSnapshot}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {import.meta.env.DEV ? <RouteChangeDebugger /> : null}
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
