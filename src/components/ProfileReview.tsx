import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase-enhanced';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  MapPin,
  Phone,
  Mail,
  Building,
  Calendar,
  Users,
  DollarSign,
  CreditCard,
  Globe,
  Target,
  Handshake
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ProfileReview = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!user.profile_completed) {
      navigate('/profile-setup');
      return;
    }

    void fetchProfile();
  }, [user, navigate, fetchProfile]);

  const handleEditProfile = () => {
    navigate('/profile-setup');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Profile not found.</p>
            <Button onClick={() => navigate('/profile-setup')}>
              Create Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      'sole_proprietor': 'Sole Proprietor',
      'professional': 'Professional',
      'sme': 'SME',
      'investor': 'Investor',
      'donor': 'Donor',
      'government': 'Government Institution'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatInvestmentStage = (stage: string) => {
    const stages: Record<string, string> = {
      pre_seed: 'Pre-seed & Seed',
      series_a: 'Series A',
      series_b_plus: 'Series B and Beyond',
      growth: 'Growth & Expansion',
      infrastructure: 'Infrastructure Projects'
    };

    return stages[stage] ?? stage;
  };

  const formatAmount = (value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }

    const numericValue =
      typeof value === 'number'
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ''));

    if (!Number.isFinite(numericValue)) {
      return String(value);
    }

    return numericValue.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

  const formatQualification = (qualification: unknown) => {
    if (!qualification) {
      return null;
    }

    if (typeof qualification === 'string') {
      return qualification;
    }

    if (typeof qualification === 'object') {
      const qual = qualification as {
        degree?: string | null;
        name?: string | null;
        institution?: string | null;
        year?: string | null;
        field?: string | null;
      };

      const title = qual.degree || qual.name || qual.field;
      const institution = qual.institution ? ` – ${qual.institution}` : '';
      const year = qual.year ? ` (${qual.year})` : '';

      if (!title && !institution && !year) {
        return null;
      }

      return `${title ?? 'Qualification'}${institution}${year}`;
    }

    return null;
  };

  const formatCardExpiry = (card: any) => {
    if (!card?.expiry_month || !card?.expiry_year) {
      return null;
    }

    const month = String(card.expiry_month).padStart(2, '0');
    const year = card.expiry_year.toString().slice(-2);
    return `${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profile_image_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {profile.business_name ? 
                      profile.business_name.substring(0, 2).toUpperCase() :
                      profile.email.substring(0, 2).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">
                    {profile.business_name || profile.email}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {getAccountTypeLabel(profile.account_type)}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleEditProfile} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{profile.address}</span>
              </div>
            )}
            {profile.country && (
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <span>{profile.country}{profile.province && `, ${profile.province}`}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business/Professional Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.account_type === 'professional' ? 'Professional Details' : 'Business Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.sectors && profile.sectors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sector/Industry</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.sectors.map((sector: string, index: number) => (
                    <Badge key={index} variant="outline">{sector}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.account_type === 'sole_proprietor' && (
              <>
                {profile.registration_number && (
                  <div>
                    <h4 className="font-medium">Registration Number</h4>
                    <p className="text-muted-foreground">{profile.registration_number}</p>
                  </div>
                )}
                {profile.customers_served && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.customers_served} customers served</span>
                  </div>
                )}
              </>
            )}

            {profile.account_type === 'professional' && (
              <>
                {profile.experience_years && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.experience_years} years of experience</span>
                  </div>
                )}
                {profile.license_number && (
                  <div>
                    <h4 className="font-medium">License Number</h4>
                    <p className="text-muted-foreground">{profile.license_number}</p>
                  </div>
                )}
                {profile.qualifications && profile.qualifications.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Qualifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.qualifications.map((qualification: unknown, index: number) => {
                        const formatted = formatQualification(qualification);
                        if (!formatted) {
                          return null;
                        }

                        return (
                          <Badge key={index} variant="outline">{formatted}</Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {profile.account_type === 'sme' && (
              <>
                {profile.ownership_structure && (
                  <div>
                    <h4 className="font-medium">Ownership Structure</h4>
                    <p className="text-muted-foreground">{profile.ownership_structure}</p>
                  </div>
                )}
                {profile.employees_count && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.employees_count} employees</span>
                  </div>
                )}
                {profile.funding_requirements && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>Funding requirement: ${profile.funding_requirements}</span>
                  </div>
                )}
              </>
            )}
            {profile.account_type === 'investor' && (
              <>
                {profile.business_name && (
                  <div>
                    <h4 className="font-medium">Organization Name</h4>
                    <p className="text-muted-foreground">{profile.business_name}</p>
                  </div>
                )}
                {profile.annual_revenue && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>
                      Annual investment capacity: {formatAmount(profile.annual_revenue)}
                    </span>
                  </div>
                )}
                {(profile.investment_ticket_min || profile.investment_ticket_max) && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>
                      Ticket size:
                      {profile.investment_ticket_min
                        ? ` ${formatAmount(profile.investment_ticket_min)}`
                        : ''}
                      {profile.investment_ticket_max
                        ? ` - ${formatAmount(profile.investment_ticket_max)}`
                        : ''}
                    </span>
                  </div>
                )}
                {profile.investment_stage && (
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span>Preferred stage: {formatInvestmentStage(profile.investment_stage)}</span>
                  </div>
                )}
                {profile.investment_focus && (
                  <div>
                    <h4 className="font-medium">Investment Focus Areas</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.investment_focus}
                    </p>
                  </div>
                )}
                {profile.investment_regions && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.investment_regions}</span>
                  </div>
                )}
                {profile.impact_focus && (
                  <div>
                    <h4 className="font-medium">Impact Priorities</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.impact_focus}
                    </p>
                  </div>
                )}
                {profile.support_services && (
                  <div>
                    <h4 className="font-medium">Support Beyond Capital</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.support_services}
                    </p>
                  </div>
                )}
              </>
            )}
            {profile.account_type === 'donor' && (
              <>
                {profile.business_name && (
                  <div>
                    <h4 className="font-medium">Organization Name</h4>
                    <p className="text-muted-foreground">{profile.business_name}</p>
                  </div>
                )}
                {profile.donor_type && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.donor_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {profile.annual_funding_budget && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>
                      Annual funding budget: {formatAmount(profile.annual_funding_budget)}
                    </span>
                  </div>
                )}
                {profile.funding_focus && (
                  <div>
                    <h4 className="font-medium">Funding Focus Areas</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.funding_focus}
                    </p>
                  </div>
                )}
                {profile.support_preferences && (
                  <div>
                    <h4 className="font-medium">Support Offered</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.support_preferences}
                    </p>
                  </div>
                )}
                {profile.impact_focus && (
                  <div>
                    <h4 className="font-medium">Impact Priorities</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.impact_focus}
                    </p>
                  </div>
                )}
                {profile.partnership_preferences && (
                  <div>
                    <h4 className="font-medium">Partnership Preferences</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.partnership_preferences}
                    </p>
                  </div>
                )}
              </>
            )}
            {profile.account_type === 'government' && (
              <>
                {profile.business_name && (
                  <div>
                    <h4 className="font-medium">Institution Name</h4>
                    <p className="text-muted-foreground">{profile.business_name}</p>
                  </div>
                )}
                {profile.institution_type && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.institution_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Department: {profile.department}</span>
                  </div>
                )}
                {profile.annual_revenue && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>
                      Annual program budget: {formatAmount(profile.annual_revenue)}
                    </span>
                  </div>
                )}
                {profile.government_focus && (
                  <div>
                    <h4 className="font-medium">Primary Focus Areas</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.government_focus}
                    </p>
                  </div>
                )}
                {profile.programs && (
                  <div>
                    <h4 className="font-medium">Key Programs & Initiatives</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.programs}
                    </p>
                  </div>
                )}
                {profile.partnership_needs && (
                  <div className="flex items-center gap-3">
                    <Handshake className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground whitespace-pre-line">
                      {profile.partnership_needs}
                    </span>
                  </div>
                )}
                {profile.impact_focus && (
                  <div>
                    <h4 className="font-medium">Impact Priorities</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {profile.impact_focus}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span>
                Payment Method: {profile.payment_method === 'phone' ? 'Mobile Money' : 'Card'}
              </span>
            </div>
            {profile.payment_phone && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-muted-foreground">Payment Phone:</span>
                <span>{profile.payment_phone}</span>
              </div>
            )}
            {profile.payment_method === 'card' && profile.card_details?.last4 && (
              <div className="flex items-center gap-3 mt-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span>
                  Card ending in {profile.card_details.last4}
                  {formatCardExpiry(profile.card_details) ? ` (expires ${formatCardExpiry(profile.card_details)})` : ''}
                  {profile.card_details.cardholder_name ? ` • ${profile.card_details.cardholder_name}` : ''}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/subscription-plans')}>
            View Subscription Plans
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};