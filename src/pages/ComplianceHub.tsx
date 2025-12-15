import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";
import { ComplianceDashboard } from "@/features/compliance/ComplianceDashboard";

const ComplianceHubPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Compliance Hub | Wathaci Connect"
        description="Monitor SME compliance tasks, document evidence, and stay audit-ready with Wathaci Connect."
        canonicalPath="/compliance-hub"
      />
      <ComplianceDashboard />
    </AppLayout>
  );
};

export default ComplianceHubPage;
