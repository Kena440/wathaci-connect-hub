import { Badge } from '@/components/ui/badge';
import ServiceCard from './ServiceCard';

const services = [
  {
    title: 'Governance & Board Administration',
    description: 'Professional board secretarial services and corporate governance solutions',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&auto=format',
    color: 'bg-blue-50 border-blue-200',
    details: 'Our governance services include board meeting coordination, minute taking, regulatory filing with PACRA, AGM planning, and compliance monitoring. We ensure your company meets all Zambian corporate governance requirements while maintaining best practices for transparency and accountability.'
  },
  {
    title: 'Risk Management & Compliance',
    description: 'Comprehensive risk assessment and regulatory compliance support',
    image: '/images/20201104_145059.jpg',
    color: 'bg-emerald-50 border-emerald-200',
    details: 'We provide thorough risk assessments, compliance audits, policy development, and regulatory monitoring. Our team stays updated with ZRA, SEC, and Bank of Zambia requirements to ensure your business remains compliant while minimizing operational risks.'
  },
  {
    title: 'Legal & Contract Advisory',
    description: 'Expert legal guidance tailored for Zambian business environment',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop&auto=format',
    color: 'bg-amber-50 border-amber-200',
    details: 'Our legal services cover contract drafting and review, employment law guidance, intellectual property protection, dispute resolution, and regulatory compliance. We specialize in Zambian business law and provide practical solutions for local and international transactions.'
  },
  {
    title: 'SME Support & Business Management',
    description: 'Dedicated support for small and medium enterprises growth',
    image: '/images/Farmer Dexter.png',
    color: 'bg-purple-50 border-purple-200',
    details: 'We offer comprehensive SME support including business plan development, market research, operational optimization, digital transformation guidance, and access to funding opportunities. Our programs are designed specifically for the Zambian market dynamics.'
  },
  {
    title: 'Project & Financial Management',
    description: 'Professional project oversight and financial planning services',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&auto=format',
    color: 'bg-rose-50 border-rose-200',
    details: 'Our project management services include planning, execution monitoring, budget management, stakeholder coordination, and performance reporting. We also provide financial planning, cash flow management, and investment advisory services tailored to Zambian businesses.'
  },
  {
    title: 'Training & Capacity Building',
    description: 'Skills development and professional training programs',
    image: '/images/Sowing Class.jpg',
    color: 'bg-indigo-50 border-indigo-200',
    details: 'We deliver customized training programs in corporate governance, financial management, leadership development, and technical skills. Our capacity building initiatives focus on empowering Zambian professionals and organizations with practical, applicable knowledge.'
  }
];

const ServicesGrid = () => {
  return (
    <section className="py-16 px-6 bg-white/60 backdrop-blur-sm" aria-labelledby="services-heading">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-300">
            Our Core Services
          </Badge>
          <h2 id="services-heading" className="text-4xl font-bold text-gray-900 mb-4">
            Business Advisory Services for Zambia's SME Ecosystem
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From startup compliance to investment readiness, our SME growth platform links entrepreneurs with strategic partnerships facilitation, marketplace for professional services, and digital transformation support.
          </p>
        </header>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              image={service.image}
              color={service.color}
              details={service.details}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;