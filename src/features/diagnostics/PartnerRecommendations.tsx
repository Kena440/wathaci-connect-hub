/**
 * Partner Recommendations Component
 * 
 * Displays recommended partners from the Wathaci network.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  GraduationCap,
  Handshake,
  Building,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { RecommendedPartner, PartnerType } from '@/@types/diagnostics';

interface PartnerRecommendationsProps {
  partners: RecommendedPartner[];
}

const partnerTypeConfig: Record<PartnerType, { icon: React.ReactNode; label: string; color: string }> = {
  bank: { icon: <Building2 className="w-5 h-5" />, label: 'Bank', color: 'bg-blue-100 text-blue-800' },
  investor: { icon: <TrendingUp className="w-5 h-5" />, label: 'Investor', color: 'bg-green-100 text-green-800' },
  donor: { icon: <Handshake className="w-5 h-5" />, label: 'Donor', color: 'bg-purple-100 text-purple-800' },
  consultant: { icon: <Users className="w-5 h-5" />, label: 'Consultant', color: 'bg-yellow-100 text-yellow-800' },
  corporate: { icon: <Building className="w-5 h-5" />, label: 'Corporate', color: 'bg-gray-100 text-gray-800' },
  training_provider: { icon: <GraduationCap className="w-5 h-5" />, label: 'Training', color: 'bg-orange-100 text-orange-800' },
  accelerator: { icon: <TrendingUp className="w-5 h-5" />, label: 'Accelerator', color: 'bg-pink-100 text-pink-800' },
  government: { icon: <Building2 className="w-5 h-5" />, label: 'Government', color: 'bg-indigo-100 text-indigo-800' },
};

const PartnerCard = ({ partner }: { partner: RecommendedPartner }) => {
  const config = partnerTypeConfig[partner.partner_type] || partnerTypeConfig.consultant;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Partner Icon/Logo */}
          <div className={`p-3 rounded-lg ${config.color.split(' ')[0]}`}>
            {partner.logo_url ? (
              <img 
                src={partner.logo_url} 
                alt={partner.name} 
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className={config.color.split(' ')[1]}>
                {config.icon}
              </div>
            )}
          </div>

          {/* Partner Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={config.color}>{config.label}</Badge>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span className="font-medium text-orange-600">{partner.fit_score}%</span>
                <span>match</span>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{partner.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{partner.reason}</p>
            
            {partner.suggested_product && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Suggested: {partner.suggested_product}
                </Badge>
              </div>
            )}
          </div>

          {/* Action */}
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PartnerRecommendations = ({ partners }: PartnerRecommendationsProps) => {
  if (partners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Find Support</CardTitle>
          <CardDescription>
            Connect with partners who can help your business grow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Complete more of your profile to get matched with relevant partners
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group partners by type
  const groupedPartners = partners.reduce((acc, partner) => {
    const type = partner.partner_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(partner);
    return acc;
  }, {} as Record<PartnerType, RecommendedPartner[]>);

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Matched Partners
          </CardTitle>
          <CardDescription>
            Partners from the Wathaci network that match your business needs
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {partners.map((partner) => (
          <PartnerCard key={partner.partner_id} partner={partner} />
        ))}
      </div>

      {/* CTA for more partners */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <h3 className="font-medium text-gray-900 mb-2">
            Looking for more support options?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Browse our full partner directory to find the right support for your needs
          </p>
          <Button variant="outline" className="gap-2">
            Browse Partners
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerRecommendations;
