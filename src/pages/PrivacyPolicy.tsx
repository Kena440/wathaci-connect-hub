import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';

export default function PrivacyPolicy() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This Privacy Policy describes how WATHACI Connect ("we", "our", or "us") collects, uses, and protects your personal information in compliance with the Data Protection Act of Zambia and regulations from the Data Protection Commission of Zambia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Personal Information:</strong> Name, email, phone number, business details</p>
                <p><strong className="text-foreground">Financial Information:</strong> Payment details processed through secure third-party providers</p>
                <p><strong className="text-foreground">Usage Data:</strong> How you interact with our platform, IP address, browser information</p>
                <p><strong className="text-foreground">Business Data:</strong> Services offered, qualifications, portfolio items</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Provide and maintain our services</li>
                <li>Process payments and transactions</li>
                <li>Match businesses with service providers</li>
                <li>Send important updates and notifications</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Protection Rights (Zambian Law)</h2>
              <p className="text-sm mb-2 text-muted-foreground">Under Zambian data protection law, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing</li>
                <li>Data portability</li>
                <li>Lodge complaints with the Data Protection Commission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction, in accordance with Zambian data protection standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Contact Information</h2>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Data Protection Officer:</strong> privacy@wathaci.org</p>
                <p><strong className="text-foreground">Address:</strong> Lusaka, Zambia</p>
                <p><strong className="text-foreground">Data Protection Commission:</strong> www.dpc.gov.zm</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
