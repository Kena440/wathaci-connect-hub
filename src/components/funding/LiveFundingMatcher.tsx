import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, TrendingUp, Users, Clock, Award } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

interface LiveFundingMatcherProps {
  viewOnly?: boolean;
  onRequestAccess?: () => void;
}

interface FundingOpportunity {
  id: string;
  title: string;
  organization: string;
  amount: string;
  deadline: string;
  sectors: string[];
  countries: string[];
  type: string;
  matchScore: number;
  successRate: number;
  requirements: string[];
}

interface Professional {
  id: string;
  name: string;
  expertise: string[];
  experience: string;
  successRate: number;
  rating: number;
  matchScore: number;
  hourlyRate: string;
  availability: string;
}

export default function LiveFundingMatcher({ viewOnly = false, onRequestAccess }: LiveFundingMatcherProps) {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('opportunities');

  const ensureInteractive = () => {
    if (viewOnly) {
      onRequestAccess?.();
      return false;
    }
    return true;
  };

  useEffect(() => {
    fetchLiveOpportunities();
  }, []);

  const fetchLiveOpportunities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('live-funding-matcher', {
        body: { action: 'fetch_live_opportunities' }
      });

      if (error) throw error;
      setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error('Error fetching live opportunities:', error);
      // Show empty state for launch - no mock data
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedProfessionals = async (opportunityId: string) => {
    if (!ensureInteractive()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('matched-professionals', {
        body: { opportunityId }
      });

      if (error) throw error;
      setProfessionals(data.professionals || []);
      setActiveTab('professionals');
    } catch (error) {
      console.error('Error fetching professionals:', error);
      // Show empty state for launch - no mock data
      setProfessionals([]);
      setActiveTab('professionals');
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'all' || opp.sectors.some(sector => 
      sector.toLowerCase().includes(sectorFilter.toLowerCase()));
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search funding opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            <SelectItem value="agriculture">Agriculture</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="renewable">Renewable Energy</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchLiveOpportunities} disabled={loading} className="w-full md:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Refresh AI Matches
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="opportunities">Live Opportunities</TabsTrigger>
          <TabsTrigger value="professionals">Matched Professionals</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading live opportunities...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
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
                        <p className="text-sm text-gray-600">{opportunity.organization}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {opportunity.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Amount:</span>
                          <span>{opportunity.amount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">Deadline:</span>
                          <span>{opportunity.deadline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">Success Rate:</span>
                          <span>{(opportunity.successRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
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
                        <div>
                          <span className="font-medium">Requirements:</span>
                          <ul className="text-sm text-gray-600 mt-1">
                            {opportunity.requirements.slice(0, 2).map((req, idx) => (
                              <li key={idx}>• {req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => fetchMatchedProfessionals(opportunity.id)}
                        className="flex-1"
                        disabled={viewOnly}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {viewOnly ? 'Subscribe to engage' : 'Find Expert Help'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={viewOnly}
                        onClick={() => {
                          if (viewOnly) {
                            onRequestAccess?.();
                          }
                        }}
                      >
                        {viewOnly ? 'Upgrade to unlock' : 'View Details'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4">
          {professionals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Select an opportunity to see matched professionals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {professionals.map((professional) => (
                <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{professional.name}</CardTitle>
                        <p className="text-sm text-gray-600">{professional.experience} experience</p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {professional.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Expertise:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {professional.expertise.map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">Success Rate:</span>
                          <span>{(professional.successRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="font-medium">Rate:</span>
                          <span>{professional.hourlyRate}/hour</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Availability:</span>
                          <span className={professional.availability === 'Available' ? 'text-green-600' : 'text-orange-600'}>
                            {professional.availability}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1">
                        Contact Professional
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