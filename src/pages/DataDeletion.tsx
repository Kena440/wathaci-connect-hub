import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { Link } from 'react-router-dom';
import { Mail, Trash2, Archive } from 'lucide-react';
import heroAbout from '@/assets/hero-about.jpg';

export default function DataDeletion() {
  return (
    <AppLayout>
      <PageHero
        title="Account & Data Deletion"
        description="How to permanently delete your WATHACI Connect account and personal data"
        backgroundImage={heroAbout}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl space-y-10">
        <Card>
          <CardHeader>
            <Mail className="w-10 h-10 text-primary mb-3" />
            <CardTitle className="text-xl">How to request deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              WATHACI Connect is operated by WATHACI Corporate Services. Account deletion is
              currently handled as an email-based process.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Send an email to{' '}
                <a
                  href="mailto:support@wathaci.com?subject=Account%20Deletion%20Request"
                  className="text-primary font-medium hover:underline"
                >
                  support@wathaci.com
                </a>
              </li>
              <li>
                Use the subject line{' '}
                <strong className="text-foreground">"Account Deletion Request"</strong>
              </li>
              <li>
                Send it from the email address registered to your account, so we can verify the
                request belongs to you
              </li>
            </ol>
            <p>
              We will verify your identity and complete the deletion within{' '}
              <strong className="text-foreground">30 days</strong> of receiving a verified request,
              and confirm by email once it is done.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Trash2 className="w-10 h-10 text-primary mb-3" />
              <CardTitle className="text-lg">What gets deleted</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Your login account and authentication records</li>
                <li>Your profile information (name, contact details, avatar, bio)</li>
                <li>Business and role data (SME, freelancer, investor or government profiles)</li>
                <li>Directory and marketplace listings you created</li>
                <li>Uploaded documents, including due diligence files</li>
                <li>Messages and notification preferences</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Archive className="w-10 h-10 text-primary mb-3" />
              <CardTitle className="text-lg">What may be retained</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Transaction and payment records, where we are required to keep them for financial,
                  tax and anti-fraud compliance under Zambian law
                </li>
                <li>Limited audit and security logs needed to protect the platform</li>
                <li>Anonymised or aggregated statistics that can no longer identify you</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Retained records are kept only for as long as the law requires, then deleted.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
            <p>
              Deleting your account is permanent and cannot be undone. Any active subscription is
              cancelled as part of the process.
            </p>
            <p>
              For more detail, see our{' '}
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>{' '}
              and{' '}
              <Link to="/data-safety" className="text-primary hover:underline">Data Safety &amp; Security</Link> pages.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
