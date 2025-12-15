import { deriveCtaLinks, mapBioToCapabilities } from '@/lib/bioCapabilityMap';

export interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  manualCapabilities?: string[];
}

export interface TeamMemberProfile extends TeamMember {
  capabilities: string[];
  cta_links: {
    services: string;
    resources: string;
    request: string;
  };
}

const teamMemberSeed: TeamMember[] = [
  {
    id: 'amukena-mukumbuta',
    full_name: 'Amukena Mukumbuta',
    role_title: 'Team Lead',
    bio: `Amukena Mukumbuta is a results-driven SME champion with 15+ years’ experience in operations, compliance, and donor-funded project management. Amukena has overseen £2M+ SME-focused programmes, cutting compliance risks and building systems that help entrepreneurs thrive. Amukena is passionate about unlocking growth for SMEs through practical support—whether it’s compliance guidance, access to finance, or digital transformation. Beyond his corporate role, he leads Wathaci Corporate Services and 440 A.M. Enterprises, platforms designed to equip Zambian SMEs with the tools, networks, and strategies they need to scale sustainably.`,
    email: 'amukena@wathaci.com',
    phone: '260 972 896005',
    photo_url: '/images/Amukena.jpeg',
    linkedin_url: 'https://www.linkedin.com/in/amukena-mukumbuta/'
  },
  {
    id: 'kasamwa-kachomba',
    full_name: 'Kasamwa Kachomba',
    role_title: 'Lead Consultant',
    bio: `Kasamwa Kachomba is a seasoned economist and contracts specialist known for steering complex donor-funded initiatives with precision. As Lead Consultant, he blends sharp analytical insight with hands-on project management, ensuring compliance, fostering stakeholder relationships, and unlocking funding for SMEs and institutions. His strengths include proposal development, donor engagement, team leadership, and establishing robust systems that drive sustainable growth. Passionate about empowering businesses, Kasamwa is committed to building strategic partnerships and delivering measurable impact.`,
    email: 'kasamwa@wathaci.com',
    phone: '+260 964 283 538',
    photo_url: '/images/Kasamwa.jpg',
    linkedin_url: 'https://www.linkedin.com/in/kasamwa-kachomba'
  }
];

export const teamMembers: TeamMemberProfile[] = teamMemberSeed.map(member => {
  const capabilities = mapBioToCapabilities(member.bio, member.manualCapabilities);
  return {
    ...member,
    capabilities,
    cta_links: deriveCtaLinks(capabilities, member.id)
  };
});
