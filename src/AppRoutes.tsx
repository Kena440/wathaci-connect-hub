import { ReactNode, Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AccountTypeRoute } from "./components/AccountTypeRoute";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RequireAuth, RequireCompletedProfile } from "./components/auth/RequireAuth";
import PrivateRoute from "./components/PrivateRoute";

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
const ProfessionalsPage = lazy(() => import("./pages/Professionals"));
const SmesPage = lazy(() => import("./pages/Smes"));
const InvestorsPage = lazy(() => import("./pages/Investors"));
const FundingHub = lazy(() => import("./pages/FundingHub"));
const ContactPage = lazy(() => import("./pages/Contact"));
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
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
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
const AccountTypeSelectionPage = lazy(() =>
  import("./pages/onboarding/AccountTypeSelectionPage").then((module) => ({
    default: module.AccountTypeSelectionPage,
  }))
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
const ComplianceHubPage = lazy(() => import("./pages/ComplianceHub"));
const Copilot = lazy(() => import("./pages/Copilot"));

const withAppLayout = (element: ReactNode, options: { showFooter?: boolean } = {}) => (
  <AppLayout showFooter={options.showFooter ?? true}>{element}</AppLayout>
);

const withAuth = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

const withCompletedProfile = (element: ReactNode) => (
  <RequireAuth>
    <RequireCompletedProfile>{element}</RequireCompletedProfile>
  </RequireAuth>
);

export const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/freelancer-hub" element={<FreelancerHub />} />
      <Route path="/professionals" element={<ProfessionalsPage />} />
      <Route path="/smes" element={<SmesPage />} />
      <Route path="/investors" element={<InvestorsPage />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/signin" element={withAppLayout(<SignIn />, { showFooter: false })} />
      <Route path="/signup" element={withAppLayout(<SignUp />, { showFooter: false })} />
      <Route
        path="/signup/sme"
        element={withAppLayout(<SmeSignupPage />, { showFooter: false })}
      />
      <Route path="/signup-zaqa" element={withAppLayout(<ZaqaSignup />, { showFooter: false })} />
      <Route path="/forgot-password" element={withAppLayout(<ForgotPassword />, { showFooter: false })} />
      <Route path="/reset-password" element={withAppLayout(<ResetPassword />, { showFooter: false })} />
      <Route
        path="/get-started"
        element={withAppLayout(
          <PrivateRoute>
            <GetStartedPage />
          </PrivateRoute>
        )}
      />
      <Route path="/onboarding" element={withAppLayout(<OnboardingLanding />, { showFooter: false })} />
      <Route
        path="/onboarding/account-type"
        element={withAppLayout(withAuth(<AccountTypeSelectionPage />), { showFooter: false })}
      />
      <Route path="/profile-setup" element={withAppLayout(<ProfileSetup />, { showFooter: false })} />
      <Route path="/profile-review" element={withAppLayout(<ProfileReview />, { showFooter: false })} />
      <Route path="/subscription-plans" element={withAppLayout(<SubscriptionPlans />)} />
      <Route path="/partnership-hub" element={<PartnershipHub />} />
      <Route path="/copilot" element={withAppLayout(withAuth(<Copilot />))} />
      <Route
        path="/funding-hub"
        element={<FundingHub />}
      />
      <Route path="/privacy-policy" element={withAppLayout(<PrivacyPolicy />)} />
      <Route path="/terms-of-service" element={withAppLayout(<TermsOfService />)} />
      <Route path="/terms" element={withAppLayout(<TermsOfService />)} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/test-error" element={withAppLayout(<TestError />, { showFooter: false })} />
      <Route path="/checkout" element={<PaymentPage />} />
      <Route
        path="/messages"
        element={withCompletedProfile(<Messages />)}
      />
      <Route
        path="/sme-assessment"
        element={
          withAppLayout(
            withCompletedProfile(<SMEAssessment />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/investor-assessment"
        element={
          withAppLayout(
            withCompletedProfile(<InvestorAssessment />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/donor-assessment"
        element={
          withAppLayout(
            withCompletedProfile(<DonorAssessment />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/professional-assessment"
        element={
          withAppLayout(
            withCompletedProfile(<ProfessionalAssessment />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/government-assessment"
        element={
          withAppLayout(
            withCompletedProfile(<GovernmentAssessment />),
            { showFooter: false }
          )
        }
      />
      
      {/* Onboarding needs assessment routes */}
      <Route
        path="/onboarding/sme/needs-assessment"
        element={
          withAppLayout(
            withAuth(<SmeNeedsAssessmentPage />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/sme"
        element={
          withAppLayout(
            withAuth(
              <AccountTypeRoute allowed={["sme"]}>
                <SmeOnboardingPage />
              </AccountTypeRoute>
            ),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/professional/needs-assessment"
        element={
          withAppLayout(
            withAuth(<ProfessionalNeedsAssessmentPage />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/professional"
        element={
          withAppLayout(
            withAuth(
              <AccountTypeRoute allowed={["professional"]}>
                <ProfessionalOnboardingPage />
              </AccountTypeRoute>
            ),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/donor/needs-assessment"
        element={
          withAppLayout(
            withAuth(<DonorNeedsAssessmentPage />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/investor/needs-assessment"
        element={
          withAppLayout(
            withAuth(<InvestorNeedsAssessmentPage />),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/investor"
        element={
          withAppLayout(
            withAuth(
              <AccountTypeRoute allowed={["investor", "donor"]}>
                <InvestorOnboardingPage />
              </AccountTypeRoute>
            ),
            { showFooter: false }
          )
        }
      />
      <Route
        path="/onboarding/government/needs-assessment"
        element={
          withAppLayout(
            withAuth(<GovernmentNeedsAssessmentPage />),
            { showFooter: false }
          )
        }
      />
      
      {/* SME Readiness feature routes */}
      <Route
        path="/readiness"
        element={withCompletedProfile(<ReadinessCheck />)}
      />
      <Route
        path="/readiness/result"
        element={withCompletedProfile(<ReadinessResult />)}
      />
      
      {/* Compliance Hub route */}
      <Route path="/compliance" element={<ComplianceHubPage />} />
      <Route path="/compliance-hub" element={<ComplianceHubPage />} />

      <Route
        path="/ai-documents"
        element={withCompletedProfile(<DocumentGenerators />)}
      />
      <Route
        path="/credit-passport"
        element={<CreditPassport />}
      />

      <Route path="*" element={withAppLayout(<NotFound />, { showFooter: false })} />
    </Routes>
  </Suspense>
);
