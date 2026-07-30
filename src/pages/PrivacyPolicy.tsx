import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-center text-sm text-muted-foreground">
              WATHACI Connect is operated by WATHACI Corporate Services, Lusaka, Zambia.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This Privacy Policy describes how WATHACI Connect ("we", "our", or "us") — a platform operated by WATHACI Corporate Services — collects, uses, and protects your personal information in compliance with the Data Protection Act of Zambia and regulations from the Data Protection Commission of Zambia.
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
              <h2 className="text-xl font-semibold mb-3">4. Cookies &amp; Advertising</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Functional cookies and local storage:</strong> We use cookies and browser local storage that are necessary to run the platform — principally to keep you signed in and to remember preferences such as your theme and language. Authentication sessions are managed by Supabase, our database and hosting provider. Disabling these will prevent you from logging in.
                </p>
                <p>
                  <strong className="text-foreground">Analytics:</strong> We may use limited analytics to understand how the platform is used (pages visited, features used, general device and browser information) so we can improve it. This information is used in aggregate and is not used to build advertising profiles by us.
                </p>
                <p>
                  <strong className="text-foreground">Cookie choices:</strong> You can block, delete or restrict cookies at any time through your browser settings. Note that blocking functional cookies will stop parts of the platform from working.
                </p>

                <p>
                  <strong className="text-foreground">Third-party advertising:</strong> Some pages may display advertising served by third parties, including Google AdSense. These providers may set or read cookies and similar identifiers on your device to measure and personalise the ads you see. We do not share your account details with advertisers.
                </p>
                <p>
                  You can control or opt out of personalised advertising through{' '}
                  <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ad Settings</a>{' '}
                  and read more in{' '}
                  <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google's advertising privacy notice</a>. You may also block or delete cookies in your browser settings.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Third-Party Processors</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>We share data only with the service providers needed to operate the platform:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong className="text-foreground">Supabase</strong> — database, authentication, file storage and hosting infrastructure.</li>
                  <li><strong className="text-foreground">Lenco</strong> — payment processing for subscriptions, wallet top-ups and marketplace payments. Card and mobile money credentials are collected and handled by Lenco; we do not store full payment credentials on our servers.</li>
                  <li><strong className="text-foreground">Advertising partners</strong> (such as Google AdSense) where ads are displayed, as described above.</li>
                </ul>
                <p>We do not sell your personal data to third parties.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Account and profile data is retained for as long as your account remains active.</li>
                <li>Following a verified deletion request, personal data is deleted or anonymised within 30 days.</li>
                <li>Transaction, invoice and payment records are retained for longer where financial, tax or anti-fraud law in Zambia requires it.</li>
                <li>Limited security and audit logs are retained for a reasonable period to protect the platform, then deleted.</li>
                <li>Aggregated or anonymised data that can no longer identify you may be retained indefinitely.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                WATHACI Connect is a business platform intended for adults. It is not directed at, and is not intended for use by, children under the age of 18. We do not knowingly collect personal data from anyone under 18. If you believe a child has provided us with personal information, contact support@wathaci.com and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Protection Rights (Zambian Law)</h2>
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
              <h2 className="text-xl font-semibold mb-3">9. Data Security</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction, in accordance with Zambian data protection standards. Traffic is encrypted in transit using HTTPS/TLS, and database access is restricted per user through Row Level Security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Related Pages</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <Link to="/data-safety-security" className="text-primary hover:underline">Data Safety &amp; Security</Link> — plain-language summary of how your data is protected.
                </li>
                <li>
                  <Link to="/account-data-deletion" className="text-primary hover:underline">Account &amp; Data Deletion</Link> — how to request removal of your account and data.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Operator:</strong> WATHACI Corporate Services</p>
                <p>
                  <strong className="text-foreground">Data Protection Officer:</strong>{' '}
                  <a href="mailto:support@wathaci.com" className="text-primary hover:underline">support@wathaci.com</a>
                </p>
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
