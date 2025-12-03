import { ReactNode, Suspense, lazy, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PrivateRoute } from "./components/PrivateRoute";
import { AccountTypeRoute } from "./components/AccountTypeRoute";
import { ConfigurationError } from "@/components/ConfigurationError";
import { RouteChangeDebugger } from "@/components/RouteChangeDebugger";
import { supabaseConfigStatus } from "@/config/appConfig";
import { getPaymentConfig } from "@/lib/payment-config";
import CisoWidget from "@/components/CisoWidget";
import AppLayout from "./components/AppLayout";
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
const SmeSignupPage = lazy(() =>
  import("./pages/SmeSignupPage").then((module) => ({ default: module.default }))
);
const ZaqaSignup = lazy(() =>
  import("./pages/ZaqaSignup").then((module) => ({ default: module.default }))
);
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GetStartedPage = lazy(() =>
  import("./pages/GetStartedPage").then((module) => ({ default: module.GetStartedPage }))
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
const DocumentGenerators = lazy(() => import("./pages/DocumentGenerators"));
const CreditPassport = lazy(() => import("./pages/CreditPassport"));
const OnboardingLanding = lazy(() =>
  import("./pages/OnboardingLanding").then((module) => ({ default: module.OnboardingLanding }))
);

// Onboarding pages
const SmeNeedsAssessmentPage = lazy(() =>
  import("./pages/onboarding/SmeNeedsAssessmentPage").then((module) => ({
    default: module.SmeNeedsAssessmentPage,
  }))
);
const ProfessionalNeedsAssessmentPage = lazy(() =>
  import("./pages/onboarding/ProfessionalNeedsAssessmentPage").then((module) => ({
    default: module.ProfessionalNeedsAssessmentPage,
  }))
);
const ProfessionalOnboardingPage = lazy(() =>
  import("./pages/onboarding/ProfessionalOnboardingPage").then((module) => ({
    default: module.ProfessionalOnboardingPage,
  }))
);
const DonorNeedsAssessmentPage = lazy(() =>
  import("./pages/onboarding/DonorNeedsAssessmentPage").then((module) => ({
    default: module.DonorNeedsAssessmentPage,
  }))
);
const InvestorNeedsAssessmentPage = lazy(() =>
  import("./pages/onboarding/InvestorNeedsAssessmentPage").then((module) => ({
    default: module.InvestorNeedsAssessmentPage,
  }))
);
const GovernmentNeedsAssessmentPage = lazy(() =>
  import("./pages/onboarding/GovernmentNeedsAssessmentPage").then((module) => ({
    default: module.GovernmentNeedsAssessmentPage,
  }))
);
const SmeOnboardingPage = lazy(() =>
  import("./pages/onboarding/SmeOnboardingPage").then((module) => ({
    default: module.SmeOnboardingPage,
  }))
);
const InvestorOnboardingPage = lazy(() =>
  import("./pages/onboarding/InvestorOnboardingPage").then((module) => ({
    default: module.InvestorOnboardingPage,
  }))
);

// SME Readiness feature pages
const ReadinessCheck = lazy(() =>
  import("./features/readiness/ReadinessCheck").then((module) => ({
    default: module.ReadinessCheck,
  }))
);
const ReadinessResult = lazy(() =>
  import("./features/readiness/ReadinessResult").then((module) => ({
    default: module.ReadinessResult,
  }))
);

// Compliance Hub feature
const ComplianceDashboard = lazy(() =>
  import("./features/compliance/ComplianceDashboard").then((module) => ({
    default: module.ComplianceDashboard,
  }))
);

const withAppLayout = (element: ReactNode, options: { showFooter?: boolean } = {}) => (
  <AppLayout showFooter={options.showFooter ?? true}>{element}</AppLayout>
);


export const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/freelancer-hub" element={<FreelancerHub />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/signin" element={withAppLayout(<SignIn />, { showFooter: false })} />
      <Route path="/signup" element={withAppLayout(<SignUp />, { showFooter: false })} />
      <Route
        path="/signup/sme"
        element={withAppLayout(<SmeSignupPage />, { showFooter: false })}
      />
      <Route path="/signup-zaqa" element={withAppLayout(<ZaqaSignup />, { showFooter: false })} />
      <Route path="/forgot-password" element={withAppLayout(<ForgotPassword />, { showFooter: false })} />
      <Route path="/reset-password" element={withAppLayout(<ResetPassword />, { showFooter: false })} />
      <Route path="/get-started" element={withAppLayout(<GetStartedPage />)} />
      <Route path="/onboarding" element={withAppLayout(<OnboardingLanding />, { showFooter: false })} />
      <Route path="/profile-setup" element={withAppLayout(<ProfileSetup />, { showFooter: false })} />
      <Route path="/profile-review" element={withAppLayout(<ProfileReview />, { showFooter: false })} />
      <Route path="/subscription-plans" element={withAppLayout(<SubscriptionPlans />)} />
      <Route path="/partnership-hub" element={<PartnershipHub />} />
      <Route
        path="/funding-hub"
        element={
          <PrivateRoute>
            <FundingHub />
          </PrivateRoute>
        }
      />
      <Route path="/privacy-policy" element={withAppLayout(<PrivacyPolicy />)} />
      <Route path="/terms-of-service" element={withAppLayout(<TermsOfService />)} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/test-error" element={withAppLayout(<TestError />, { showFooter: false })} />
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
          withAppLayout(
            <PrivateRoute>
              <SMEAssessment />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/investor-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <InvestorAssessment />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/donor-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <DonorAssessment />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/professional-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <ProfessionalAssessment />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/government-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <GovernmentAssessment />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      
      {/* Onboarding needs assessment routes */}
      <Route
        path="/onboarding/sme/needs-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <SmeNeedsAssessmentPage />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/sme"
        element={
          withAppLayout(
            <PrivateRoute>
              <AccountTypeRoute allowed={["sme"]}>
                <SmeOnboardingPage />
              </AccountTypeRoute>
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/professional/needs-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <ProfessionalNeedsAssessmentPage />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/professional"
        element={
          withAppLayout(
            <PrivateRoute>
              <AccountTypeRoute allowed={["professional"]}>
                <ProfessionalOnboardingPage />
              </AccountTypeRoute>
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/donor/needs-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <DonorNeedsAssessmentPage />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/investor/needs-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <InvestorNeedsAssessmentPage />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/investor"
        element={
          withAppLayout(
            <PrivateRoute>
              <AccountTypeRoute allowed={["investor", "donor"]}>
                <InvestorOnboardingPage />
              </AccountTypeRoute>
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/government/needs-assessment"
        element={
          withAppLayout(
            <PrivateRoute>
              <GovernmentNeedsAssessmentPage />
            </PrivateRoute>,
            { showFooter: false }
          )
        }
      />
      
      {/* SME Readiness feature routes */}
      <Route
        path="/readiness"
        element={
          <PrivateRoute>
            <ReadinessCheck />
          </PrivateRoute>
        }
      />
      <Route
        path="/readiness/result"
        element={
          <PrivateRoute>
            <ReadinessResult />
          </PrivateRoute>
        }
      />
      
      {/* Compliance Hub route */}
      <Route
        path="/compliance"
        element={
          withAppLayout(
            <PrivateRoute>
              <ComplianceDashboard />
            </PrivateRoute>
          )
        }
      />

      <Route
        path="/ai-documents"
        element={
          <PrivateRoute>
            <DocumentGenerators />
          </PrivateRoute>
        }
      />
      <Route
        path="/credit-passport"
        element={
          <PrivateRoute>
            <CreditPassport />
          </PrivateRoute>
        }
      />

      <Route path="*" element={withAppLayout(<NotFound />, { showFooter: false })} />
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

  const isRuntimeProd =
    import.meta.env.PROD || paymentConfigSnapshot.config.environment === "production";

  const shouldBlockRender =
    (isRuntimeProd && !supabaseConfigStatus.hasValidConfig) ||
    paymentConfigSnapshot.fatalIssues.length > 0;

  if (!shouldBlockRender && !supabaseConfigStatus.hasValidConfig) {
    console.warn(
      "[app] Supabase configuration missing. Using mock client so the UI can continue rendering.",
      {
        missingUrlKeys: supabaseConfigStatus.missingUrlKeys,
        missingAnonKeys: supabaseConfigStatus.missingAnonKeys,
      },
    );
  }

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
          <CisoWidget />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
