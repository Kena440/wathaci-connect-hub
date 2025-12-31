import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { Users, Target, Heart, Globe, Award, Lightbulb } from 'lucide-react';
import heroAbout from '@/assets/hero-about.jpg';

const teamValues = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To empower Zambian businesses and entrepreneurs by providing a comprehensive platform that connects them with opportunities, resources, and each other."
  },
  {
    icon: Heart,
    title: "Our Vision",
    description: "A thriving Zambian business ecosystem where every entrepreneur has access to the tools, knowledge, and networks they need to succeed."
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We leverage cutting-edge AI technology to match businesses with the right partners, funding opportunities, and professional services."
  },
  {
    icon: Globe,
    title: "Community",
    description: "Building strong connections between SMEs, investors, freelancers, and service providers across Zambia and beyond."
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "Fostering partnerships and collaborations that drive sustainable business growth and economic development."
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Committed to delivering high-quality services and maintaining the highest standards of professionalism and integrity."
  }
];

export default function AboutUs() {
  return (
    <AppLayout>
      <PageHero
        title="About WATHACI"
        description="Empowering Zambian businesses to thrive through technology, connections, and opportunity"
        backgroundImage={heroAbout}
      />
      
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Introduction Section */}
        <section className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-6">Who We Are</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            WATHACI Connect is Zambia's premier business services ecosystem, designed to connect 
            entrepreneurs, SMEs, investors, and professionals. We provide an AI-powered platform 
            that facilitates business matching, funding discovery, and professional collaboration 
            to drive economic growth across Zambia.
          </p>
        </section>

        {/* Values Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-10">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamValues.map((value, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <value.icon className="w-12 h-12 mx-auto text-primary mb-4" />
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="bg-muted/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose WATHACI?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">For Businesses</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Access to funding opportunities and investor networks
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  AI-powered matching with service providers and partners
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Comprehensive business resources and training materials
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Marketplace for products and services
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">For Professionals</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Connect with clients seeking your expertise
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Showcase your skills and qualifications
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Collaborate with other professionals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Grow your professional network
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-2">
            Have questions? We'd love to hear from you.
          </p>
          <p className="text-primary font-medium">
            Email: info@wathaci.org
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
