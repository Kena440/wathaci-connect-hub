import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SeoMeta from "@/components/SeoMeta";

interface TeamMember {
  name: string;
  title: string;
  bio: string;
  email?: string;
  phone?: string;
  image?: string;
  linkedin_url?: string;
}

export default function AboutUs() {
  const teamMembers: TeamMember[] = [
    {
      name: "Amukena Mukumbuta",
      title: "Team Lead",
      bio: "Amukena Mukumbuta is a results-driven SME champion with 15+ years’ experience in operations, compliance, and donor-funded project management. Amukena has overseen £2M+ SME-focused programmes, cutting compliance risks and building systems that help entrepreneurs thrive. Amukena is passionate about unlocking growth for SMEs through practical support—whether it’s compliance guidance, access to finance, or digital transformation. Beyond his corporate role, he leads Wathaci Corporate Services and 440 A.M. Enterprises, platforms designed to equip Zambian SMEs with the tools, networks, and strategies they need to scale sustainably.",
      email: "amukena@wathaci.com",
      phone: "260 972 896005",
      image: "/images/Amukena.jpeg",
      linkedin_url: "https://www.linkedin.com/in/amukena-mukumbuta/",
    },
    {
      name: "Kasamwa Kachomba",
      title: "Lead Consultant",
      bio: "Kasamwa Kachomba is a seasoned economist and contracts specialist known for steering complex donor-funded initiatives with precision. As Lead Consultant, he blends sharp analytical insight with hands-on project management, ensuring compliance, fostering stakeholder relationships, and unlocking funding for SMEs and institutions. His strengths include proposal development, donor engagement, team leadership, and establishing robust systems that drive sustainable growth. Passionate about empowering businesses, Kasamwa is committed to building strategic partnerships and delivering measurable impact.",
      email: "kasamwa@wathaci.com",
      phone: "+260 964 283 538",
      image: "/images/Kasamwa.jpg",
      linkedin_url: "https://www.linkedin.com/in/kasamwa-kachomba",
    },
  ];

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
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-white/70 to-blue-50/60"
        />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl space-y-8 min-h-screen">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
          <Card>
            <CardHeader>
              <h1 className="text-3xl font-bold text-center text-gray-900">About Wathaci Connect</h1>
            </CardHeader>
            <CardContent className="space-y-4 text-base leading-relaxed text-gray-700">
              <p>
                Wathaci Connect is a Zambia-first SME ecosystem platform. We connect professionals, SMEs, donors, and investors through
                an opportunity matching engine, a professional services marketplace, and compliance workflows that help businesses grow with confidence.
              </p>
              <p>
                Our team blends donor-programme experience, corporate governance expertise, and technology delivery so that every entrepreneur can access
                reliable services—from business formalisation to funding readiness—without leaving the Zambian market.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Our mission</h2>
                  <p className="text-sm text-gray-700 mt-2">
                    Strengthen the Zambian SME ecosystem by making business advisory, compliance support, and capital matching
                    easy to access for every entrepreneur and professional.
                  </p>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">What makes us different</h2>
                  <p className="text-sm text-gray-700 mt-2">
                    A single platform where professionals monetise expertise, SMEs complete readiness checklists, and donors or investors
                    find verifiable pipeline opportunities in Zambia.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold text-center text-gray-900">Our Team</h2>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {teamMembers.map((member, idx) => (
                <Card
                  key={idx}
                  className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/40 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="text-center relative z-10">
                    <img
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      loading="lazy"
                      decoding="async"
                      className="w-40 h-40 rounded-full mx-auto mb-4 object-cover"
                    />
                    <CardTitle className="text-xl">{member.name}</CardTitle>
                    <p className="text-gray-600">{member.title}</p>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-sm text-gray-600 text-justify">
                      {member.bio}
                    </p>
                    <div className="text-sm text-gray-600 mt-4">
                      {member.email && <p>📧 {member.email}</p>}
                      {member.phone && <p>📱 {member.phone}</p>}
                      {member.linkedin_url && (
                        <a
                          href={member.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:underline mt-2"
                        >
                          <Linkedin className="w-4 h-4 mr-1" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

