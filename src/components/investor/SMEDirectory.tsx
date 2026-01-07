import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Users, TrendingUp, Heart, DollarSign } from 'lucide-react';

interface SME {
  id: string;
  business_name: string | null;
  industry_sector: string | null;
  city: string | null;
  bio: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  funding_needed: number | null;
  compliance_verified: boolean | null;
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
        .select('id, business_name, industry_sector, city, bio, employee_count, annual_revenue, funding_needed, compliance_verified')
        .eq('account_type', 'sme')
        .not('business_name', 'is', null);

      if (error) throw error;
      setSmes((data || []) as SME[]);
    } catch (error) {
      console.error('Error fetching SMEs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSMEs = smes.filter(sme => {
    const matchesSearch = sme.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sme.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === 'all' || sme.industry_sector === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading SMEs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search SMEs..."
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
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSMEs.map((sme) => (
          <Card key={sme.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{sme.business_name || 'Unnamed Business'}</CardTitle>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {sme.city || 'Location not specified'}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 line-clamp-3">{sme.bio || 'No description'}</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSMEs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No SMEs found.
        </div>
      )}
    </div>
  );
};

export default SMEDirectory;
