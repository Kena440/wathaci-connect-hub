import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Clock, Search, Filter, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createSearchPattern } from '@/lib/utils/search';

export const FreelancerDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all-locations');
  const [experienceFilter, setExperienceFilter] = useState('all');

  const { data: freelancers = [], isLoading } = useQuery({
    queryKey: ['freelancer-directory', searchTerm, selectedLocation, experienceFilter],
    queryFn: async () => {
      // CRITICAL FIX: Use v_directory_profiles and include both 'freelancer' and 'professional' types
      // NO is_profile_complete filter - show all users with relevant account_type
      let query = supabase
        .from('v_directory_profiles')
        .select('*')
        .in('account_type', ['freelancer', 'professional'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchTerm) {
        const safePattern = createSearchPattern(searchTerm);
        query = query.or(
          `display_name.ilike.${safePattern},` +
          `full_name.ilike.${safePattern},` +
          `professional_title.ilike.${safePattern},` +
          `bio.ilike.${safePattern}`
        );
      }

      if (selectedLocation && selectedLocation !== 'all-locations') {
        const locationPattern = createSearchPattern(selectedLocation);
        query = query.ilike('city', locationPattern);
      }

      if (experienceFilter && experienceFilter !== 'all') {
        query = query.eq('experience_level', experienceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filter Freelancers</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search freelancers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-locations">All Locations</SelectItem>
              <SelectItem value="lusaka">Lusaka</SelectItem>
              <SelectItem value="ndola">Ndola</SelectItem>
              <SelectItem value="kitwe">Kitwe</SelectItem>
              <SelectItem value="livingstone">Livingstone</SelectItem>
            </SelectContent>
          </Select>

          <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="entry">Entry Level</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : freelancers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No freelancers available yet.</p>
          <p className="text-muted-foreground/70 mt-2">
            We're building our network of verified professionals. Check back soon!
          </p>
          <Button asChild className="mt-4">
            <Link to="/get-started">Join as a Professional</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freelancers.map((freelancer) => {
            const isIncomplete = !freelancer.is_profile_complete;
            return (
              <Card key={freelancer.id} className={`hover:shadow-lg transition-shadow ${isIncomplete ? 'border-dashed border-muted-foreground/30' : ''}`}>
                <CardHeader className="text-center">
                  <Avatar className={`w-20 h-20 mx-auto mb-4 ${isIncomplete ? 'opacity-70' : ''}`}>
                    <AvatarImage src={freelancer.profile_photo_url || undefined} alt={freelancer.display_name || freelancer.full_name || 'Freelancer'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(freelancer.display_name || freelancer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center justify-center gap-2">
                    <CardTitle className="text-xl">{freelancer.display_name || freelancer.full_name || 'New Member'}</CardTitle>
                    {isIncomplete && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">New</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{freelancer.professional_title || (isIncomplete ? 'Professional' : 'Freelancer')}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    {freelancer.experience_level && (
                      <Badge variant="secondary" className="capitalize">
                        {freelancer.experience_level}
                      </Badge>
                    )}
                    {(freelancer.city || freelancer.country) ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{[freelancer.city, freelancer.country].filter(Boolean).join(', ')}</span>
                      </div>
                    ) : isIncomplete ? (
                      <div className="flex items-center gap-1 text-muted-foreground/50">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm italic">Location TBD</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {freelancer.primary_skills && freelancer.primary_skills.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {freelancer.primary_skills.slice(0, 3).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {freelancer.primary_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{freelancer.primary_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : isIncomplete ? (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground/50 italic">Skills coming soon...</p>
                    </div>
                  ) : null}
                  
                  <div className="flex items-center justify-between mb-4">
                    {freelancer.rate_range && (
                      <div>
                        <span className="text-lg font-bold text-primary">{freelancer.rate_range}</span>
                      </div>
                    )}
                    {freelancer.availability && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className={`text-sm capitalize ${
                          freelancer.availability === 'available' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {freelancer.availability}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button asChild className="w-full" variant={isIncomplete ? "outline" : "default"}>
                    <Link to={`/profile/${freelancer.id}`}>
                      View Profile
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {freelancers.length > 0 && (
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/professionals">
              View All Professionals
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
