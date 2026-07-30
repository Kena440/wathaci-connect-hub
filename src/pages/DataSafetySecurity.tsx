import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { Link } from 'react-router-dom';
import { Lock, Database, CreditCard, ShieldCheck } from 'lucide-react';
import heroAbout from '@/assets/hero-about.jpg';

const pillars = [
  {
    icon: Lock,
    title: 'Encrypted in transit',
    description:
      'All traffic between your device and WATHACI Connect is protected with HTTPS/TLS encryption, so information you submit cannot be read in transit.',
  },
  {
    icon: Database,
    title: 'Protected storage',
    description:
      'Your data is stored in a managed PostgreSQL database (Supabase) with Row Level Security policies that restrict every record to the account that owns it.',
  },
  {
    icon: CreditCard,
    title: 'Payments handled by Lenco',
    description:
      'Card and mobile money details are collected and processed by our payment provider, Lenco. We do not store full payment credentials on our servers.',
  },
  {
    icon: ShieldCheck,
    title: 'Never sold',
    description:
      'We do not sell your personal data to third parties. Data is shared only with the processors needed to operate the platform, or where required by Zambian law.',
  },
];

const categories = [
  {
    name: 'Account & profile information',
    why: 'Name, email, phone number and account type — used to create your account, authenticate you and display your profile.',
  },
  {
    name: 'Business data',
    why: 'Company details, services, qualifications, portfolio items and uploaded documents — used for directory listings, matching and due diligence.',
  },
  {
    name: 'Usage data',
    why: 'Pages visited, features used, IP address and browser information — used to keep the platform secure and improve the experience.',
  },
  {
    name: 'Payment metadata',
    why: 'Transaction references, amounts, currency and status returned by our payment provider — used for billing, receipts and reconciliation. Full card details are never stored by us.',
  },
];

export default function DataSafetySecurity() {
  return (
    <AppLayout>
      <PageHero
        title="Data Safety & Security"
        description="How WATHACI Connect collects, protects and uses your information"
        backgroundImage={heroAbout}
      />

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <section className="text-center mb-12">
          <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            WATHACI Connect is operated by WATHACI Corporate Services, Lusaka, Zambia. This page
            explains, in plain language, how we keep your data safe. It complements our{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>,
            which is the full legal document.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-2xl font-bold text-center mb-8">How we protect your data</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {pillars.map((p) => (
              <Card key={p.title}>
                <CardHeader>
                  <p.icon className="w-10 h-10 text-primary mb-3" />
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-2xl font-bold text-center mb-8">What we collect and why</h2>
          <Card>
            <CardContent className="pt-6 space-y-5">
              {categories.map((c) => (
                <div key={c.name}>
                  <h3 className="font-semibold mb-1">{c.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.why}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-center mb-8">Your rights</h2>
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
              <p>
                Under the Data Protection Act of Zambia you may request access to your personal
                data, ask us to correct inaccurate information, or request that your data be
                deleted.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground">Access:</strong> request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Correction:</strong> update your profile in the app, or email us for anything you cannot edit.</li>
                <li><strong className="text-foreground">Deletion:</strong> request full removal of your account and data.</li>
              </ul>
              <p>
                See the{' '}
                <Link to="/account-data-deletion" className="text-primary hover:underline">Account &amp; Data Deletion</Link>{' '}
                page for how to request deletion, or read the full{' '}
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
                Questions? Email{' '}
                <a href="mailto:support@wathaci.com" className="text-primary hover:underline">support@wathaci.com</a>.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
