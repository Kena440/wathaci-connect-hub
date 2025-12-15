import { ArrowLeft, ArrowRight, Building2, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamMemberCard from "@/components/team/TeamMemberCard";
import { teamMembers } from "@/data/teamMembers";

const approachHighlights = [
  {
    title: "Compliance-first delivery",
    description:
      "Practical workflows for PACRA, ZRA, and donor obligations so SMEs stay funding-ready without the guesswork.",
    icon: Compass
  },
  {
    title: "Marketplace + expertise",
    description:
      "A vetted services marketplace combined with advisory from practitioners who have scaled donor-funded programmes and SMEs.",
    icon: Building2
  },
  {
    title: "Resources you can apply today",
    description:
      "Toolkits, templates, and explainers that match each team member’s specialty so you can execute with confidence.",
    icon: ArrowRight
  }
];

export default function AboutUs() {
  return (
    <AppLayout>
      <SeoMeta
        title="About Wathaci Connect | Zambia SME ecosystem platform"
        description="Learn how Wathaci Connect strengthens Zambia's SME ecosystem with advisory services, compliance support, investment readiness, and a professional services marketplace that links entrepreneurs, investors, donors, and partners."
        keywords={[
          "Wathaci Connect team",
          "Zambia SME ecosystem platform",
          "SME compliance and investment readiness",
          "Professional services marketplace Zambia",
          "Connect entrepreneurs with investors in Zambia"
        ]}
        canonicalPath="/about"
        robots="index, follow"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'About Wathaci Connect',
            url: 'https://www.wathaci.com/about',
            description:
              "Wathaci Connect is a Lusaka-based SME ecosystem platform providing advisory services, compliance support, and an opportunity matching engine for professionals, SMEs, investors, and donors.",
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.wathaci.com/' },
                { '@type': 'ListItem', position: 2, name: 'About', item: 'https://www.wathaci.com/about' }
              ]
            }
          }
        ]}
      />
      <div className="min-h-screen bg-gray-50 relative">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage: "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2002_49_07%20PM.png')",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-white/80 to-blue-50/70"
        />
        <div className="relative z-10 container mx-auto px-4 py-10 max-w-6xl space-y-10 min-h-screen">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-blue-700 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>

          <section className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-wide text-blue-700 font-semibold">About Wathaci Connect</p>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Zambia-first platform for SME compliance, growth, and trusted service delivery.
              </h1>
              <p className="text-base leading-relaxed text-gray-700">
                Wathaci Connect links SMEs, professionals, donors, and investors with the tools, services, and guidance needed to scale confidently in Zambia. We blend compliance workflows, a professional services marketplace, and readiness assessments so businesses can secure capital and deliver with assurance.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center px-4 py-2 rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                  Explore Marketplace
                </Link>
                <Link
                  to="/resources"
                  className="inline-flex items-center px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                >
                  Browse Resources
                </Link>
              </div>
            </div>
            <Card className="bg-white/70 backdrop-blur shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700 text-sm leading-relaxed">
                <p>
                  Strengthen the Zambian SME ecosystem by making business advisory, compliance support, and capital matching easy to access for every entrepreneur and professional.
                </p>
                <p>
                  We keep the About Us page public and indexable so founders, partners, and regulators can quickly understand who is behind Wathaci Connect and how to engage us.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Compliance-first</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800">Funding ready</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">Human + digital</span>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <h2 className="text-2xl font-bold text-gray-900 text-center">How We Work</h2>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              {approachHighlights.map(({ title, description, icon: Icon }) => (
                <div key={title} className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/85 backdrop-blur">
            <CardHeader>
              <h2 className="text-2xl font-bold text-center text-gray-900">Meet the Team</h2>
              <p className="text-center text-gray-600 text-sm">
                Real people with verifiable track records in compliance, governance, donor-funded delivery, and SME growth. Each profile links directly to services and resources matched to their bio—no dead ends.
              </p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {teamMembers.map(member => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
            <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Need a tailored SME support path?</h3>
                <p className="text-white/90 text-sm mt-1">
                  Start with our readiness flows or contact us directly—no sign-in required to view who we are and how we help.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/marketplace/request"
                  className="inline-flex items-center px-4 py-2 rounded-full bg-white text-blue-700 font-semibold shadow-sm hover:bg-blue-50"
                >
                  Request Support
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-4 py-2 rounded-full bg-transparent border border-white text-white hover:bg-white hover:text-blue-700"
                >
                  Talk to Us
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
