import type { SeoMetadata } from "@/components/Seo";

const SITE_URL = "https://wathaci.com";
const DEFAULT_IMAGE = "https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png";

export const seoMetadata: Record<string, SeoMetadata> = {
  home: {
    title: "Wathaci Connect | Zambian business platform for SMEs",
    description:
      "Wathaci Connect is the SME growth platform linking Zambian entrepreneurs to professional services, compliance support, and funding and investment matching.",
    keywords: [
      "Wathaci Connect",
      "Zambian business platform",
      "SME ecosystem Zambia",
      "Entrepreneur support Zambia",
      "Business opportunities Zambia",
      "Funding and investment matching",
      "SME growth platform",
      "Digital platform for SME compliance and growth",
    ],
    canonical: `${SITE_URL}/`,
    ogImage: DEFAULT_IMAGE,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Wathaci Connect",
        url: SITE_URL,
        logo: DEFAULT_IMAGE,
        description:
          "Wathaci Connect is a Zambian business platform and SME ecosystem connecting entrepreneurs with professional services, compliance support, and funding and investment matching.",
        sameAs: [
          "https://www.linkedin.com/company/wathaci",
          "https://twitter.com/wathaci",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Wathaci Connect",
        url: SITE_URL,
        image: DEFAULT_IMAGE,
        address: {
          "@type": "PostalAddress",
          addressCountry: "Zambia",
          addressLocality: "Lusaka",
        },
        description: "Lusaka business services platform offering SME digital transformation, business advisory services, and funding and investment matching across Zambia.",
        areaServed: "Zambia",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Wathaci Connect",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/marketplace?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Business advisory services and SME compliance support",
        serviceType: "Business advisory services",
        areaServed: "Zambia",
        provider: {
          "@type": "Organization",
          name: "Wathaci Connect",
        },
        description:
          "Marketplace for professional services that delivers consultancy services for SMEs, SME compliance support, and opportunity matching engine features for Zambia business innovation.",
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Funding and investment matching",
        serviceType: "Funding and investment matching",
        areaServed: "Zambia",
        provider: {
          "@type": "Organization",
          name: "Wathaci Connect",
        },
        description:
          "Investor engagement portal connecting entrepreneurs with investors in Zambia and aligning African SME development partners with business opportunities.",
      },
    ],
  },
  marketplace: {
    title: "Marketplace for professional services | Wathaci Connect",
    description:
      "Browse the Wathaci Connect marketplace for professional services, consultancy services for SMEs, and SME compliance support tailored to Zambia's entrepreneurs.",
    keywords: [
      "Marketplace for professional services",
      "Business advisory services",
      "SME compliance support",
      "Consultancy services for SMEs",
      "Business networking Zambia",
      "Lusaka business services",
    ],
    canonical: `${SITE_URL}/marketplace`,
    ogImage: DEFAULT_IMAGE,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Marketplace for professional services",
        serviceType: "Consultancy services for SMEs",
        areaServed: "Zambia",
        provider: {
          "@type": "Organization",
          name: "Wathaci Connect",
        },
        description:
          "Digital platform to find expert business services online in Zambia, including business advisory services, SME compliance support, and opportunity matching.",
      },
    ],
  },
  resources: {
    title: "SME growth platform resources | Wathaci Connect",
    description:
      "Access capacity-building resources, business formalisation tools, and digital services for SMEs through the Wathaci Connect SME growth platform.",
    keywords: [
      "SME growth platform",
      "Capacity-building resources",
      "Business formalisation tools",
      "Digital services for SMEs",
      "Startup ecosystem support",
      "SME digital transformation",
    ],
    canonical: `${SITE_URL}/resources`,
    ogImage: DEFAULT_IMAGE,
  },
  fundingHub: {
    title: "Funding and investment matching | Wathaci Connect",
    description:
      "Use the Wathaci Connect investor engagement portal to connect entrepreneurs with investors in Zambia and discover business opportunities Zambia wide.",
    keywords: [
      "Funding and investment matching",
      "Investor engagement portal",
      "Connect entrepreneurs with investors in Zambia",
      "Business opportunities Zambia",
      "African SME development",
      "Opportunity matching engine",
    ],
    canonical: `${SITE_URL}/funding-hub`,
    ogImage: DEFAULT_IMAGE,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Investor engagement portal",
        serviceType: "Funding and investment matching",
        areaServed: "Zambia",
        description:
          "Opportunity matching engine aligning Zambian SMEs with donors and investors, showcasing Zambia business innovation and African SME development projects.",
        provider: {
          "@type": "Organization",
          name: "Wathaci Connect",
        },
      },
    ],
  },
  partnershipHub: {
    title: "Strategic partnerships facilitation | Wathaci Connect",
    description:
      "Join the Wathaci Connect strategic partnerships facilitation hub to drive Zambia business innovation and build regional alliances for SME growth.",
    keywords: [
      "Strategic partnerships facilitation",
      "Business networking Zambia",
      "Zambia business innovation",
      "SME ecosystem Zambia",
      "African SME development",
      "Business opportunities Zambia",
    ],
    canonical: `${SITE_URL}/partnership-hub`,
    ogImage: DEFAULT_IMAGE,
  },
  freelancerHub: {
    title: "Professionals & consultants for SMEs | Wathaci Connect",
    description:
      "Discover consultancy services for SMEs, Lusaka business services, and business advisory experts through the Wathaci Connect freelancer and professional hub.",
    keywords: [
      "Consultancy services for SMEs",
      "Business advisory services",
      "Marketplace for professional services",
      "Business networking Zambia",
      "Lusaka business services",
      "Digital services for SMEs",
    ],
    canonical: `${SITE_URL}/freelancer-hub`,
    ogImage: DEFAULT_IMAGE,
  },
  about: {
    title: "About Wathaci Connect | Zambian business platform",
    description:
      "Learn how Wathaci Connect strengthens the SME ecosystem in Zambia with business advisory services, funding and investment matching, and strategic partnerships facilitation.",
    keywords: [
      "Wathaci Connect",
      "SME ecosystem Zambia",
      "Entrepreneur support Zambia",
      "African SME development",
      "Business opportunities Zambia",
      "Funding and investment matching",
    ],
    canonical: `${SITE_URL}/about-us`,
    ogImage: DEFAULT_IMAGE,
  },
  terms: {
    title: "Terms of Service | Wathaci Connect legal",
    description:
      "Review the Wathaci Connect terms for using our Zambian business platform, marketplace for professional services, and funding and investment matching tools.",
    keywords: [
      "Wathaci Connect terms",
      "Zambian business platform",
      "Marketplace for professional services",
      "SME compliance support",
    ],
    canonical: `${SITE_URL}/terms-of-service`,
    ogImage: DEFAULT_IMAGE,
  },
  privacy: {
    title: "Privacy Policy | Wathaci Connect",
    description:
      "Understand how Wathaci Connect protects SMEs, professionals, and investors across Zambia through secure data practices for our digital services for SMEs.",
    keywords: [
      "Wathaci Connect privacy",
      "Digital services for SMEs",
      "Zambian business platform",
      "SME ecosystem Zambia",
    ],
    canonical: `${SITE_URL}/privacy-policy`,
    ogImage: DEFAULT_IMAGE,
  },
};

export { SITE_URL, DEFAULT_IMAGE };
