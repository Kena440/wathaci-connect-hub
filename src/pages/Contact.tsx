import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";

const ContactPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Contact Wathaci Connect"
        description="Talk to the Wathaci Connect team about partnerships, onboarding, or platform support."
        canonicalPath="/contact"
      />
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-orange-600 uppercase">Contact</p>
          <h1 className="text-4xl font-bold text-gray-900">How to reach us</h1>
          <p className="text-lg text-gray-700">
            We're here to help with onboarding, partnerships, compliance support, and investment readiness questions.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border rounded-2xl shadow-sm space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">General enquiries</h2>
            <p className="text-gray-700">Email: <a className="text-orange-600" href="mailto:support@wathaci.com">support@wathaci.com</a></p>
            <p className="text-gray-700">WhatsApp / Phone: +260 977 000 000</p>
            <p className="text-gray-700">Location: Lusaka, Zambia</p>
          </div>
          <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl shadow-sm space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Partnerships & media</h2>
            <p className="text-gray-700">Email: <a className="text-orange-600" href="mailto:partnerships@wathaci.com">partnerships@wathaci.com</a></p>
            <p className="text-gray-700">Media: <a className="text-orange-600" href="mailto:media@wathaci.com">media@wathaci.com</a></p>
            <p className="text-gray-700">We respond within 1-2 business days.</p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default ContactPage;
