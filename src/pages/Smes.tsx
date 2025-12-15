import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";

const SmesPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="SMEs | Wathaci Connect"
        description="Find vetted professionals, funding readiness tools, and compliance workflows built for Zambian SMEs."
        canonicalPath="/smes"
      />
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-orange-600 uppercase">For Zambian SMEs</p>
          <h1 className="text-4xl font-bold text-gray-900">Accelerate growth with trusted experts and funding support</h1>
          <p className="text-lg text-gray-700">
            Build your readiness checklist, connect with compliance specialists, and access curated investor and donor programmes through one platform.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Find trusted experts",
              description: "Match with advisory, legal, accounting, and technology professionals who understand SME realities.",
            },
            {
              title: "Get funding ready",
              description: "Use the Credit Passport and readiness assessments to prepare for banks, investors, and grant makers.",
            },
            {
              title: "Stay compliant",
              description: "Track PACRA, tax, and sector-specific requirements with reminders and checklists tailored for your industry.",
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

export default SmesPage;
