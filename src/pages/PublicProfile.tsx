import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Globe, Linkedin, Briefcase, Building2, TrendingUp, Landmark, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Helmet } from 'react-helmet-async';

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', id],
    queryFn: async () => {
      if (!id) throw new Error('Profile ID required');

      const { data, error } = await supabase
        .from('v_public_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">Profile Not Found</h1>
        <p className="text-muted-foreground">This profile doesn't exist or is not public.</p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  const getAccountIcon = () => {
    switch (profile.account_type) {
      case 'sme':
        return <Briefcase className="h-5 w-5" />;
      case 'freelancer':
        return <Briefcase className="h-5 w-5" />;
      case 'investor':
        return <TrendingUp className="h-5 w-5" />;
      case 'government':
        return <Landmark className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getAccountLabel = () => {
    switch (profile.account_type) {
      case 'sme':
        return 'SME / Business';
      case 'freelancer':
        return 'Professional';
      case 'investor':
        return 'Investor';
      case 'government':
        return 'Government Institution';
      default:
        return 'Member';
    }
  };

  const displayName = profile.display_name || 'Anonymous';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <Helmet>
        <title>{displayName} - WATHACI Connect</title>
        <meta name="description" content={profile.bio || `View ${displayName}'s profile on WATHACI Connect`} />
      </Helmet>

      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>

          {/* Header Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar className="h-24 w-24 shrink-0">
                  <AvatarImage src={profile.profile_photo_url || undefined} alt={displayName} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                    {profile.professional_title && (
                      <p className="text-lg text-muted-foreground">{profile.professional_title}</p>
                    )}
                    {profile.business_name && (
                      <p className="text-lg text-muted-foreground">{profile.business_name}</p>
                    )}
                    {profile.institution_name && (
                      <p className="text-lg text-muted-foreground">{profile.institution_name}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getAccountIcon()}
                      {getAccountLabel()}
                    </Badge>
                    {profile.city && profile.country && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {profile.city}, {profile.country}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                    {profile.linkedin && (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-6 text-foreground">{profile.bio}</p>
              )}
            </CardContent>
          </Card>

          {/* Role-specific details */}
          {profile.account_type === 'sme' && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold">Business Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.industry && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
                    <p className="text-foreground">{profile.industry}</p>
                  </div>
                )}
                {profile.business_stage && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Business Stage</h3>
                    <p className="text-foreground capitalize">{profile.business_stage}</p>
                  </div>
                )}
                {profile.sme_services && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Products/Services</h3>
                    <p className="text-foreground">{profile.sme_services}</p>
                  </div>
                )}
                {profile.top_needs && profile.top_needs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Looking For</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.top_needs.map((need: string) => (
                        <Badge key={need} variant="outline">{need}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.areas_served && profile.areas_served.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Areas Served</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.areas_served.map((area: string) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile.account_type === 'freelancer' && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold">Professional Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.primary_skills && profile.primary_skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.primary_skills.map((skill: string) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.freelancer_services && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Services Offered</h3>
                    <p className="text-foreground">{profile.freelancer_services}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {profile.experience_level && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Experience</h3>
                      <p className="text-foreground capitalize">{profile.experience_level}</p>
                    </div>
                  )}
                  {profile.availability && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Availability</h3>
                      <p className="text-foreground capitalize">{profile.availability}</p>
                    </div>
                  )}
                  {profile.work_mode && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Work Mode</h3>
                      <p className="text-foreground capitalize">{profile.work_mode}</p>
                    </div>
                  )}
                  {profile.rate_range && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Rate ({profile.rate_type})</h3>
                      <p className="text-foreground">{profile.rate_range}</p>
                    </div>
                  )}
                </div>
                {profile.languages && profile.languages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((lang: string) => (
                        <Badge key={lang} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.certifications && profile.certifications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.certifications.map((cert: string) => (
                        <Badge key={cert} variant="secondary">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile.account_type === 'investor' && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold">Investment Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.investor_type && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Investor Type</h3>
                    <p className="text-foreground capitalize">{profile.investor_type}</p>
                  </div>
                )}
                {profile.ticket_size_range && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Ticket Size</h3>
                    <p className="text-foreground">{profile.ticket_size_range}</p>
                  </div>
                )}
                {profile.thesis && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Investment Thesis</h3>
                    <p className="text-foreground">{profile.thesis}</p>
                  </div>
                )}
                {profile.investor_sectors && profile.investor_sectors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Sectors of Interest</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.investor_sectors.map((sector: string) => (
                        <Badge key={sector}>{sector}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.investment_stage_focus && profile.investment_stage_focus.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Stage Focus</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.investment_stage_focus.map((stage: string) => (
                        <Badge key={stage} variant="secondary">{stage}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.geo_focus && profile.geo_focus.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Geographic Focus</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.geo_focus.map((geo: string) => (
                        <Badge key={geo} variant="outline">{geo}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile.account_type === 'government' && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold">Institution Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.department_or_unit && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Department/Unit</h3>
                    <p className="text-foreground">{profile.department_or_unit}</p>
                  </div>
                )}
                {profile.institution_type && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Institution Type</h3>
                    <p className="text-foreground capitalize">{profile.institution_type}</p>
                  </div>
                )}
                {profile.services_or_programmes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Services/Programmes</h3>
                    <p className="text-foreground">{profile.services_or_programmes}</p>
                  </div>
                )}
                {profile.mandate_areas && profile.mandate_areas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Mandate Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.mandate_areas.map((area: string) => (
                        <Badge key={area}>{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.collaboration_interests && profile.collaboration_interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Looking to Collaborate On</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.collaboration_interests.map((interest: string) => (
                        <Badge key={interest} variant="secondary">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
