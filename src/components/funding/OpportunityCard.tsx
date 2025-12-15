import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, MapPin } from 'lucide-react';

export interface FundingOpportunityCardProps {
  opportunity: {
    id: string;
    title: string;
    provider_name: string;
    description: string;
    sectors?: string[];
    instrument_type?: string[];
    country_focus?: string[];
    ticket_size_min?: number | null;
    ticket_size_max?: number | null;
    currency?: string | null;
    application_deadline?: string | null;
    is_featured?: boolean;
    matchScore?: number;
  };
  onApply: (id: string) => void;
  onDetails: (id: string) => void;
}

export const OpportunityCard = ({ opportunity, onApply, onDetails }: FundingOpportunityCardProps) => {
  const currency = opportunity.currency || 'USD';
  const deadline = opportunity.application_deadline
    ? new Date(opportunity.application_deadline).toLocaleDateString()
    : 'Rolling';
  const ticketLabel = opportunity.ticket_size_min || opportunity.ticket_size_max
    ? `${currency} ${opportunity.ticket_size_min ?? '—'} - ${opportunity.ticket_size_max ?? '—'}`
    : 'Ticket size on request';

  return (
    <Card className="h-full hover:shadow-lg transition-shadow border border-slate-200">
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">{opportunity.title}</CardTitle>
            <p className="text-sm text-slate-600">{opportunity.provider_name}</p>
          </div>
          {typeof opportunity.matchScore === 'number' && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              {Math.round(opportunity.matchScore)}% match
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(opportunity.instrument_type || []).map(type => (
            <Badge key={type} variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
              {type}
            </Badge>
          ))}
          {(opportunity.sectors || []).slice(0, 3).map(sector => (
            <Badge key={sector} variant="secondary" className="bg-slate-100 text-slate-800">
              {sector}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700 line-clamp-3">{opportunity.description}</p>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span>{ticketLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Deadline: {deadline}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-600" />
            <span>{(opportunity.country_focus || ['Zambia']).join(', ')}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApply(opportunity.id)} className="flex-1">
            Express Interest
          </Button>
          <Button variant="outline" onClick={() => onDetails(opportunity.id)} className="flex-1">
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};