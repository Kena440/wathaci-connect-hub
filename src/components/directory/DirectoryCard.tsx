import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Briefcase, Building2, TrendingUp, Landmark, ExternalLink, AlertCircle } from 'lucide-react';
import { DirectoryProfile } from '@/hooks/useDirectoryProfiles';

interface DirectoryCardProps {
  profile: DirectoryProfile;
}

export function DirectoryCard({ profile }: DirectoryCardProps) {
  const displayName = profile.display_name || profile.full_name || 'New Member';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const photoUrl = profile.profile_photo_url || profile.avatar_url;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  
  // Check if profile is incomplete - show gracefully
  const isIncomplete = !profile.is_profile_complete;

  const getAccountIcon = () => {
    switch (profile.account_type) {
      case 'sme':
        return <Building2 className="h-4 w-4" />;
      case 'freelancer':
        return <Briefcase className="h-4 w-4" />;
      case 'investor':
        return <TrendingUp className="h-4 w-4" />;
      case 'government':
        return <Landmark className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getHeadline = () => {
    switch (profile.account_type) {
      case 'freelancer':
        return profile.professional_title || (isIncomplete ? 'Professional' : null);
      case 'sme':
        return profile.business_name || (isIncomplete ? 'Business' : null);
      case 'investor':
        return profile.investor_type ? `${profile.investor_type} Investor` : (isIncomplete ? 'Investor' : null);
      case 'government':
        return profile.institution_name || (isIncomplete ? 'Government Institution' : null);
      default:
        return null;
    }
  };

  const getTags = (): string[] => {
    switch (profile.account_type) {
      case 'freelancer':
        return profile.primary_skills?.slice(0, 3) || [];
      case 'sme':
        return profile.top_needs?.slice(0, 3) || (profile.industry ? [profile.industry] : []);
      case 'investor':
        return profile.investor_sectors?.slice(0, 3) || [];
      case 'government':
        return profile.mandate_areas?.slice(0, 3) || [];
      default:
        return [];
    }
  };

  const getSubtitle = () => {
    switch (profile.account_type) {
      case 'freelancer':
        return profile.experience_level ? `${profile.experience_level} level` : null;
      case 'sme':
        return profile.business_stage;
      case 'investor':
        return profile.ticket_size_range;
      case 'government':
        return profile.institution_type;
      default:
        return null;
    }
  };

  const headline = getHeadline();
  const tags = getTags();
  const subtitle = getSubtitle();

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 group ${isIncomplete ? 'border-dashed border-muted-foreground/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className={`h-14 w-14 shrink-0 ${isIncomplete ? 'opacity-70' : ''}`}>
            <AvatarImage src={photoUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {displayName}
              </h3>
              {isIncomplete && (
                <Badge variant="outline" className="text-xs shrink-0 border-amber-500/50 text-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  New
                </Badge>
              )}
            </div>
            {headline && (
              <p className="text-muted-foreground text-sm truncate">{headline}</p>
            )}
            {subtitle && (
              <p className="text-muted-foreground/70 text-xs capitalize">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {location ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location}</span>
          </div>
        ) : isIncomplete ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground/50 italic">
            <MapPin className="h-3.5 w-3.5" />
            <span>Location not set</span>
          </div>
        ) : null}

        {profile.bio ? (
          <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
        ) : isIncomplete ? (
          <p className="text-sm text-muted-foreground/50 italic">Profile details coming soon...</p>
        ) : null}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button asChild className="w-full mt-4" variant={isIncomplete ? "outline" : "default"}>
          <Link to={`/profile/${profile.id}`}>
            View Profile
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
