import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, MapPin } from 'lucide-react';

export interface FundingOpportunityCardProps {
  opportunity: {
    id: string;
    title: string;
    funder_name?: string | null;
    funding_type: string;
    target_sectors?: string[];
    eligible_applicants?: string[];
    eligible_countries?: string[];
    funding_amount_min?: number | null;
    funding_amount_max?: number | null;
    currency?: string | null;
    deadline?: string | null;
    tags?: string[];
    relevance_score?: number;
  };
  onApply: (id: string) => void;
  onDetails: (id: string) => void;
}

const formatAmount = (opportunity: FundingOpportunityCardProps['opportunity']) => {
  const currency = opportunity.currency || 'USD';
  if (opportunity.funding_amount_min || opportunity.funding_amount_max) {
    const min = opportunity.funding_amount_min ? `${currency} ${opportunity.funding_amount_min}` : '—';
    const max = opportunity.funding_amount_max ? `${currency} ${opportunity.funding_amount_max}` : '—';
    return `${min} - ${max}`;
  }
  return 'Funding amount not specified';
};

export const OpportunityCard = ({ opportunity, onApply, onDetails }: FundingOpportunityCardProps) => {
  const deadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString()
    : 'Rolling';

  return (
    <Card className="h-full hover:shadow-lg transition-shadow border border-slate-200">
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">{opportunity.title}</CardTitle>
            <p className="text-sm text-slate-600">{opportunity.funder_name || 'Funding partner'}</p>
          </div>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 capitalize">
            {opportunity.funding_type || 'grant'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {(opportunity.target_sectors || []).slice(0, 3).map(sector => (
            <Badge key={sector} variant="secondary" className="bg-slate-100 text-slate-800">
              {sector}
            </Badge>
          ))}
          {(opportunity.tags || []).slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span>{formatAmount(opportunity)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Deadline: {deadline}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-600" />
            <span>{(opportunity.eligible_countries || ['Zambia']).join(', ')}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApply(opportunity.id)} className="flex-1">
            Apply now
          </Button>
          <Button variant="outline" onClick={() => onDetails(opportunity.id)} className="flex-1">
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
