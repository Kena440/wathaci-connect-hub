import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/lib/supabase-enhanced';
import IndustryMatcher from '@/components/industry/IndustryMatcher';
import { Handshake, Users, TrendingUp, Award, Building, Globe, CheckCircle, Star, Target } from 'lucide-react';
import BackToHomeButton from '@/components/BackToHomeButton';

const partnerTypes = [
  {
    id: 'service-provider',
    title: 'Service Provider',
    description: 'Join our network of professional service providers',
    icon: Users,
    benefits: ['Access to qualified leads', 'Marketing support', 'Professional certification', 'Revenue sharing opportunities']
  },
  {
    id: 'technology',
    title: 'Technology Partner', 
    description: 'Integrate your solutions with our platform',
    icon: Globe,
    benefits: ['API access and documentation', 'Co-marketing opportunities', 'Technical support', 'Joint solution development']
  },
  {
    id: 'referral',
    title: 'Referral Partner',
    description: 'Earn commissions by referring clients',
    icon: TrendingUp,
    benefits: ['Competitive commission rates', 'Real-time tracking dashboard', 'Marketing materials provided', 'Dedicated partner support']
  },
  {
    id: 'financial',
    title: 'Financial Partner',
    description: 'Provide financial services and solutions',
    icon: Building,
    benefits: ['Access to business loan applications', 'Insurance product integration', 'Financial advisory services', 'Revenue sharing on products']
  },
  {
    id: 'training',
    title: 'Training & Education Partner',
    description: 'Offer training and educational services',
    icon: Award,
    benefits: ['Course content integration', 'Certification programs', 'Workshop hosting', 'Knowledge sharing platform']
  }
];

// Mock data removed for launch - replace with real partner data from database
const currentPartners: any[] = [];

export const PartnershipHub = () => {
  const [formData, setFormData] = useState({
    companyName: '', contactName: '', email: '', phone: '', partnershipType: '', otherPartnershipType: '', description: '', website: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('partnership_applications')
        .insert([{
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          partnership_type: formData.partnershipType === 'other' ? formData.otherPartnershipType : formData.partnershipType,
          description: formData.description,
          website: formData.website,
          status: 'pending'
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      <Header />
      
      <div 
        className="fixed inset-0 bg-center bg-cover"
        style={{
          backgroundImage: "url('/images/Marketplace.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/60 to-green-50/70" />
      <div className="relative z-10 py-16 text-gray-900">
        <div className="max-w-6xl mx-auto px-6 mb-6 flex justify-start">
          <BackToHomeButton />
        </div>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Handshake className="w-16 h-16 mx-auto mb-6 text-gray-900" />
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Partnership Hub</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Join our growing network of partners and help transform Zambian businesses together
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 bg-white">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="types">Partner Types</TabsTrigger>
            <TabsTrigger value="matcher" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Industry Match
            </TabsTrigger>
            <TabsTrigger value="current">Current Partners</TabsTrigger>
            <TabsTrigger value="apply">Apply Now</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Partner with WATHACI?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Join Zambia's leading business services ecosystem and unlock new opportunities for growth and collaboration.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="text-center">
                  <Building className="w-12 h-12 mx-auto text-orange-600 mb-4" />
                  <CardTitle>Market Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Connect with thousands of Zambian businesses actively seeking professional services and solutions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="text-center">
                  <Award className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <CardTitle>Brand Recognition</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Enhance your credibility through association with WATHACI's trusted brand and quality standards.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-orange-600 mb-4" />
                  <CardTitle>Revenue Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Unlock new revenue streams through our partnership programs and collaborative opportunities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Card key={type.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <IconComponent className="w-12 h-12 mx-auto text-orange-600 mb-4" />
                      <CardTitle className="text-xl">{type.title}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {type.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="matcher" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Industry-Specific Partnership Matching</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Find specialized partners, funding, and collaboration opportunities tailored to your specific industry sector.
              </p>
            </div>
            <IndustryMatcher />
          </TabsContent>

          <TabsContent value="current" className="space-y-8">
            {currentPartners.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Our partner network is growing!</p>
                <p className="text-gray-400 mt-2">We're actively building partnerships with leading organizations. Join us!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentPartners.map((partner, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <div className="text-4xl mb-4">{partner.logo}</div>
                      <CardTitle className="text-xl">{partner.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">{partner.type}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-center mb-4">{partner.description}</p>
                      {partner.status === 'verified' && (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Verified Partner</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="apply" className="space-y-8">
            <div className="max-w-2xl mx-auto">
              {submitted ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for your interest in partnering with WATHACI. Our team will review your application and get back to you within 3-5 business days.
                    </p>
                    <Button onClick={() => setSubmitted(false)} className="bg-orange-600 hover:bg-orange-700">Submit Another Application</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Partnership Application</CardTitle>
                    <CardDescription>Tell us about your organization and how we can work together</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name *</Label>
                          <Input id="companyName" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactName">Contact Name *</Label>
                          <Input id="contactName" value={formData.contactName} onChange={(e) => handleInputChange('contactName', e.target.value)} required />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input id="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="partnershipType">Partnership Type *</Label>
                        <Select onValueChange={(value) => handleInputChange('partnershipType', value)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select partnership type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service-provider">Service Provider</SelectItem>
                            <SelectItem value="technology">Technology Partner</SelectItem>
                            <SelectItem value="referral">Referral Partner</SelectItem>
                            <SelectItem value="financial">Financial Partner</SelectItem>
                            <SelectItem value="training">Training & Education Partner</SelectItem>
                            <SelectItem value="government">Government Agency</SelectItem>
                            <SelectItem value="ngo">NGO/Non-Profit</SelectItem>
                            <SelectItem value="media">Media Partner</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.partnershipType === 'other' && (
                        <div className="space-y-2">
                          <Label htmlFor="otherPartnershipType">Please specify partnership type *</Label>
                          <Input 
                            id="otherPartnershipType" 
                            value={formData.otherPartnershipType} 
                            onChange={(e) => handleInputChange('otherPartnershipType', e.target.value)} 
                            placeholder="Enter your partnership type"
                            required 
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" type="url" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Tell us about your organization *</Label>
                        <Textarea id="description" rows={4} value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};