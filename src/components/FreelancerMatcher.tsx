import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabaseClient } from '@/lib/supabaseClient';
import { Search, MapPin, DollarSign, Star, Loader2, Linkedin } from 'lucide-react';

interface Freelancer {
  avatar?: string;
  name?: string;
  title?: string;
  match_score?: number;
  bio?: string;
  skills?: string[];
  location?: string;
  hourly_rate?: number;
  rating?: number;
  reviews_count?: number;
  linkedin_url?: string;
}

export const FreelancerMatcher = () => {
  const [projectRequirements, setProjectRequirements] = useState('');
  const [skills, setSkills] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [matches, setMatches] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    if (!projectRequirements || !skills) {
      alert('Please describe your project and required skills');
      return;
    }

    setLoading(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim());
      const { data, error } = await supabase.functions.invoke('freelancer-matcher', {
        body: { 
          projectRequirements, 
          skills: skillsArray, 
          budget: budget ? parseInt(budget) : null,
          location 
        }
      });

      if (error) throw error;
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error matching freelancers:', error);
      alert('Error finding matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find the Perfect Freelancer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe your project requirements..."
            value={projectRequirements}
            onChange={(e) => setProjectRequirements(e.target.value)}
            rows={3}
          />
          
          <Input
            placeholder="Required skills (comma separated, e.g., React, Node.js, Design)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
          
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Budget per hour (ZMW)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            
            <Input
              placeholder="Preferred location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Button onClick={handleMatch} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Freelancers...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Freelancers
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Matched Freelancers</h2>
          {matches.map((freelancer: Freelancer, idx: number) => (
            <Card
              key={idx}
              className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/40 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
                    <AvatarFallback>{freelancer.name?.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{freelancer.name}</h3>
                        <p className="text-gray-600">{freelancer.title}</p>
                        {freelancer.linkedin_url && (
                          <a
                            href={freelancer.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:underline mt-1 text-sm"
                          >
                            <Linkedin className="w-4 h-4 mr-1" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {freelancer.match_score}% Match
                      </Badge>
                    </div>

                    {freelancer.bio && (
                      <p className="text-gray-700 text-justify mb-3 transition-all duration-300 max-h-16 overflow-hidden group-hover:max-h-40">
                        {freelancer.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {freelancer.skills?.slice(0, 5).map((skill: string, skillIdx: number) => (
                        <Badge key={skillIdx} variant="outline">{skill}</Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {freelancer.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ZMW {freelancer.hourly_rate}/hour
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {freelancer.rating} ({freelancer.reviews_count} reviews)
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1">Contact Freelancer</Button>
                      <Button variant="outline">View Profile</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 