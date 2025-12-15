import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TeamMemberProfile } from '@/data/teamMembers';

interface TeamMemberCardProps {
  member: TeamMemberProfile;
}

const MAX_BIO_PREVIEW = 240;

export const TeamMemberCard = ({ member }: TeamMemberCardProps) => {
  const [showFullBio, setShowFullBio] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const bioContent = useMemo(() => {
    if (showFullBio || member.bio.length <= MAX_BIO_PREVIEW) return member.bio;
    return `${member.bio.slice(0, MAX_BIO_PREVIEW)}…`;
  }, [member.bio, showFullBio]);

  const hasExtendedBio = member.bio.length > MAX_BIO_PREVIEW;

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/60 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="text-center relative z-10 space-y-3">
        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border border-blue-100 shadow-sm">
          <img
            src={hasImageError ? '/placeholder.svg' : member.photo_url || '/placeholder.svg'}
            alt={member.full_name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setHasImageError(true)}
          />
        </div>
        <CardTitle className="text-xl text-gray-900">{member.full_name}</CardTitle>
        <p className="text-sm text-blue-700 font-medium">{member.role_title}</p>
        {member.capabilities.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {member.capabilities.map(capability => (
              <span
                key={`${member.id}-${capability}`}
                className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
              >
                {capability}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <p className="text-sm leading-relaxed text-gray-700 text-justify">
          {bioContent}
          {hasExtendedBio && (
            <button
              type="button"
              className="text-blue-700 font-semibold ml-1 hover:underline"
              onClick={() => setShowFullBio(prev => !prev)}
            >
              {showFullBio ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>

        <div className="text-sm text-gray-600 space-y-1">
          {member.email && <p>📧 {member.email}</p>}
          {member.phone && <p>📱 {member.phone}</p>}
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-700 hover:underline"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <Button asChild variant="secondary" className="rounded-full shadow-sm bg-blue-600 text-white hover:bg-blue-700">
            <Link to={member.cta_links.services}>View Services</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-blue-200 text-blue-800 hover:bg-blue-50">
            <Link to={member.cta_links.resources}>View Resources</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-amber-700 hover:bg-amber-50">
            <Link to={member.cta_links.request}>Request Support</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;
