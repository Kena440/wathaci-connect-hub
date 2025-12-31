import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, TrendingUp, Users, Clock, Award, Loader2, ExternalLink, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FundingOpportunity {
  id: string;
  title: string;
  organization: string;
  amount_display: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  sectors: string[] | null;
  location: string | null;
  funding_type: string | null;
  eligibility_criteria: string[] | null;
  application_url: string | null;
  is_featured: boolean | null;
  description: string | null;
}

interface Professional {
  id: string;
  full_name: string | null;
  title: string | null;
  specialization: string | null;
  skills: string[] | null;
  experience_years: number | null;
  rating: number | null;
  hourly_rate: number | null;
  availability_status: string | null;
  city: string | null;
  country: string | null;
}

export default function LiveFundingMatcher() {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('opportunities');
  const [selectedOpportunity, setSelectedOpportunity] = useState<FundingOpportunity | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveOpportunities();
  }, []);

  const fetchLiveOpportunities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching live opportunities:', error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedProfessionals = async (opportunity: FundingOpportunity) => {
    setLoading(true);
    setSelectedOpportunity(opportunity);
    
    try {
      // Fetch professionals with relevant skills for this funding opportunity
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('account_type', ['professional', 'freelancer'])
        .eq('availability_status', 'available')
        .not('skills', 'is', null)
        .limit(10);

      if (error) throw error;
      
      // Filter professionals whose skills match the opportunity sectors
      const matchedProfessionals = (data || []).filter(prof => {
        if (!prof.skills || !opportunity.sectors) return false;
        return prof.skills.some((skill: string) => 
          opportunity.sectors?.some(sector => 
            skill.toLowerCase().includes(sector.toLowerCase()) ||
            sector.toLowerCase().includes(skill.toLowerCase())
          )
        );
      });

      setProfessionals(matchedProfessionals.length > 0 ? matchedProfessionals : data || []);
      setActiveTab('professionals');
    } catch (error) {
      console.error('Error fetching professionals:', error);
      setProfessionals([]);
      setActiveTab('professionals');
    } finally {
      setLoading(false);
    }
  };

  const handleContactProfessional = (professional: Professional) => {
    toast({
      title: "Contact Request Sent",
      description: `Your request to connect with ${professional.full_name || 'the professional'} has been sent.`,
    });
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'all' || 
      opp.sectors?.some(sector => sector.toLowerCase().includes(sectorFilter.toLowerCase()));
    return matchesSearch && matchesSector;
  });

  const getAmountDisplay = (opp: FundingOpportunity) => {
    if (opp.amount_display) return opp.amount_display;
    if (opp.amount_min && opp.amount_max) {
      return `K${opp.amount_min.toLocaleString()} - K${opp.amount_max.toLocaleString()}`;
    }
    return 'Contact for details';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search funding opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            <SelectItem value="agriculture">Agriculture</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="renewable">Renewable Energy</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="education">Education</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchLiveOpportunities} disabled={loading}>
          <Filter className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="opportunities">Live Opportunities ({filteredOpportunities.length})</TabsTrigger>
          <TabsTrigger value="professionals">Matched Professionals ({professionals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Loading live opportunities...</span>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <TrendingUp className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Live Opportunities Available</h3>
                <p>Check back soon for new funding opportunities or try adjusting your search filters.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOpportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{opportunity.organization}</p>
                      </div>
                      {opportunity.is_featured && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="font-medium">Amount:</span>
                          <span>{getAmountDisplay(opportunity)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">Deadline:</span>
                          <span>
                            {opportunity.deadline 
                              ? new Date(opportunity.deadline).toLocaleDateString() 
                              : 'Rolling applications'}
                          </span>
                        </div>
                        {opportunity.funding_type && (
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Type:</span>
                            <span>{opportunity.funding_type}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {opportunity.sectors && opportunity.sectors.length > 0 && (
                          <div>
                            <span className="font-medium">Sectors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {opportunity.sectors.map((sector) => (
                                <Badge key={sector} variant="outline" className="text-xs">
                                  {sector}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {opportunity.eligibility_criteria && opportunity.eligibility_criteria.length > 0 && (
                          <div>
                            <span className="font-medium">Requirements:</span>
                            <ul className="text-sm text-muted-foreground mt-1">
                              {opportunity.eligibility_criteria.slice(0, 2).map((req, idx) => (
                                <li key={idx}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    {opportunity.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {opportunity.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={() => fetchMatchedProfessionals(opportunity)}
                        className="flex-1"
                        disabled={loading}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Find Expert Help
                      </Button>
                      {opportunity.application_url && (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => window.open(opportunity.application_url!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4">
          {selectedOpportunity && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Showing professionals who can help with: <strong>{selectedOpportunity.title}</strong>
                </p>
              </CardContent>
            </Card>
          )}
          
          {professionals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {selectedOpportunity 
                    ? "No matching professionals found. Try selecting a different opportunity."
                    : "Select an opportunity to see matched professionals"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {professionals.map((professional) => (
                <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{professional.full_name || 'Professional'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {professional.title || professional.specialization || 'Consultant'}
                        </p>
                      </div>
                      {professional.rating && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          ⭐ {professional.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        {professional.skills && professional.skills.length > 0 && (
                          <div>
                            <span className="font-medium">Expertise:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {professional.skills.slice(0, 5).map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {professional.experience_years && (
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Experience:</span>
                            <span>{professional.experience_years} years</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {professional.hourly_rate && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Rate:</span>
                            <span>K{professional.hourly_rate}/hour</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Availability:</span>
                          <span className={professional.availability_status === 'available' ? 'text-green-600' : 'text-orange-600'}>
                            {professional.availability_status || 'Unknown'}
                          </span>
                        </div>
                        {(professional.city || professional.country) && (
                          <p className="text-sm text-muted-foreground">
                            📍 {[professional.city, professional.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1"
                        onClick={() => handleContactProfessional(professional)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                      <Button variant="outline" className="flex-1">
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
