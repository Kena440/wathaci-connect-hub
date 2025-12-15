import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";

const InvestorsPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Investors | Wathaci Connect"
        description="Source investor-ready SMEs, verify traction with Credit Passport insights, and collaborate with trusted local experts."
        canonicalPath="/investors"
      />
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-orange-600 uppercase">For donors & investors</p>
          <h1 className="text-4xl font-bold text-gray-900">Invest with confidence in the Zambian SME ecosystem</h1>
          <p className="text-lg text-gray-700">
            Access screened opportunities, diligence-ready data, and delivery partners to deploy capital and programmes responsibly.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Discover vetted SMEs",
              description: "Filter by sector, location, and readiness to find businesses aligned with your thesis or programme goals.",
            },
            {
              title: "Assess quickly",
              description: "Use Credit Passport results, compliance status, and opportunity history to prioritise the right deals.",
            },
            {
              title: "Deliver with partners",
              description: "Engage certified professionals for governance, ESG, and reporting so capital and grants are deployed safely.",
            },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-2xl border bg-white shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

export default InvestorsPage;
