import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { Mail, MapPin, Clock } from 'lucide-react';
import heroAbout from '@/assets/hero-about.jpg';

export default function Contact() {
  return (
    <AppLayout>
      <PageHero
        title="Contact Us"
        description="We'd love to hear from you — questions, feedback, or partnership ideas"
        backgroundImage={heroAbout}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <section className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-3">Get in touch</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            WATHACI Connect is operated by WATHACI Corporate Services. Whether you need help with
            your account, have a privacy or legal question, or simply want to say hello, our team
            reads every message.
          </p>
        </section>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Mail className="w-10 h-10 mx-auto text-primary mb-3" />
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <a
                href="mailto:support@wathaci.com"
                className="text-primary font-medium hover:underline break-all"
              >
                support@wathaci.com
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                Support, privacy and legal inquiries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <MapPin className="w-10 h-10 mx-auto text-primary mb-3" />
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="font-medium">Lusaka, Zambia</p>
              <p className="text-sm text-muted-foreground mt-2">WATHACI Corporate Services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Clock className="w-10 h-10 mx-auto text-primary mb-3" />
              <CardTitle className="text-lg">Response Time</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="font-medium">Within 2 business days</p>
              <p className="text-sm text-muted-foreground mt-2">Monday to Friday</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-10">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-muted-foreground">
              For account or data deletion requests, email us with the subject line
              {' '}<strong className="text-foreground">"Account Deletion Request"</strong>.
            </p>
            <a
              href="mailto:support@wathaci.com?subject=Account%20Deletion%20Request"
              className="text-primary font-medium hover:underline"
            >
              support@wathaci.com
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
