import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase-enhanced';
import { Search, MapPin, Users, TrendingUp, Heart, DollarSign } from 'lucide-react';

interface SME {
  id: string;
  business_name: string;
  business_type: string;
  industry: string;
  location: string;
  description: string;
  employees_count: number;
  annual_revenue: number;
  funding_needed: number;
  compliance_verified: boolean;
}

const SMEDirectory = () => {
  const [smes, setSmes] = useState<SME[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');

  useEffect(() => {
    fetchSMEs();
  }, []);

  const fetchSMEs = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'sole_proprietor')
        .eq('compliance_verified', true)
        .not('business_name', 'is', null);

      if (error) throw error;
      setSmes(data || []);
    } catch (error) {
      console.error('Error fetching SMEs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSMEs = smes.filter(sme => {
    const matchesSearch = sme.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sme.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === 'all' || sme.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const handleShowInterest = (smeId: string, type: 'investment' | 'donation') => {
    // This will be handled by the InterestModal component
    console.log(`Showing ${type} interest in SME:`, smeId);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading SMEs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search SMEs by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="agriculture">Agriculture</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="services">Services</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSMEs.map((sme) => (
          <Card key={sme.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{sme.business_name}</CardTitle>
                <Badge variant="secondary">{sme.industry}</Badge>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {sme.location}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 line-clamp-3">{sme.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1 text-blue-500" />
                  {sme.employees_count} employees
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  K{sme.annual_revenue?.toLocaleString()}
                </div>
              </div>

              {sme.funding_needed && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center text-sm font-medium text-orange-800">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Funding Needed: K{sme.funding_needed.toLocaleString()}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleShowInterest(sme.id, 'investment')}
                  className="flex-1"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Invest
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleShowInterest(sme.id, 'donation')}
                  className="flex-1"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Donate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSMEs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No SMEs found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default SMEDirectory;