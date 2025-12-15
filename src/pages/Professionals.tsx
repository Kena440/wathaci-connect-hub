import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";

const ProfessionalsPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Professionals | Wathaci Connect"
        description="Showcase your services to SMEs and donors across Zambia, publish packages, and collaborate through Wathaci Connect's professional marketplace."
        canonicalPath="/professionals"
      />
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-orange-600 uppercase">For professional service providers</p>
          <h1 className="text-4xl font-bold text-gray-900">Grow your practice with ready-to-buy SME clients</h1>
          <p className="text-lg text-gray-700">
            Publish advisory, legal, finance, and technology services, respond to SME requests, and collaborate with donors and investors
            looking for qualified experts.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Launch a verified profile",
              description:
                "Add credentials, industries served, and packaged offers so SMEs can self-serve or request proposals directly.",
            },
            {
              title: "Win trusted engagements",
              description:
                "Match with SMEs needing compliance, funding readiness, and digital transformation support across Zambia.",
            },
            {
              title: "Collaborate securely",
              description:
                "Use Wathaci Connect workflows, messaging, and payments to keep engagements auditable and on track.",
            },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-2xl border bg-white shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="p-6 bg-orange-50 border border-orange-100 rounded-2xl space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Who it's for</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Independent consultants, accounting and legal practices, ESG and compliance specialists</li>
            <li>Technology implementers supporting SMEs with cloud, payments, and automation projects</li>
            <li>Regional firms seeking local delivery partners for donor and investor-backed programmes</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
};

export default ProfessionalsPage;
