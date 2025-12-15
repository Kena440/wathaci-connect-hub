import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";
import { ComplianceDashboard } from "@/features/compliance/ComplianceDashboard";

const ComplianceHubPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Compliance Hub | Wathaci Connect"
        description="Track Zambian regulatory, tax, and governance readiness with live checklists, AI health scores, and specialist recommendations."
        canonicalPath="/compliance-hub"
      />
      <ComplianceDashboard />
    </AppLayout>
  );
};

export default ComplianceHubPage;
