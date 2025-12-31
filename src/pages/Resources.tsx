import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Calendar, User, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import heroResources from '@/assets/hero-resources.jpg';

const resources = [
  {
    id: 1,
    title: 'Corporate Governance Best Practices Guide',
    type: 'Guide',
    category: 'Governance',
    description: 'Comprehensive guide to implementing effective corporate governance in Zambian companies',
    downloadCount: 1247,
    date: '2024-01-15',
    author: 'WATHACI Team',
    fileSize: '2.3 MB',
    isPremium: false
  },
  {
    id: 2,
    title: 'PACRA Filing Requirements Checklist',
    type: 'Checklist',
    category: 'Compliance',
    description: 'Step-by-step checklist for all PACRA filing requirements and deadlines',
    downloadCount: 892,
    date: '2024-01-10',
    author: 'Legal Team',
    fileSize: '1.1 MB',
    isPremium: false
  },
  {
    id: 3,
    title: 'SME Business Plan Template',
    type: 'Template',
    category: 'Business Development',
    description: 'Professional business plan template tailored for Zambian SMEs',
    downloadCount: 2156,
    date: '2024-01-08',
    author: 'Business Advisors',
    fileSize: '3.7 MB',
    isPremium: true
  },
  {
    id: 4,
    title: 'Risk Assessment Framework',
    type: 'Framework',
    category: 'Risk Management',
    description: 'Complete framework for conducting business risk assessments',
    downloadCount: 654,
    date: '2024-01-05',
    author: 'Risk Specialists',
    fileSize: '4.2 MB',
    isPremium: true
  },
  {
    id: 5,
    title: 'Employment Law Updates 2024',
    type: 'Report',
    category: 'Legal',
    description: 'Latest updates to Zambian employment law and compliance requirements',
    downloadCount: 743,
    date: '2024-01-03',
    author: 'Legal Team',
    fileSize: '1.8 MB',
    isPremium: false
  },
  {
    id: 6,
    title: 'Financial Management for SMEs',
    type: 'Course',
    category: 'Training',
    description: 'Online course covering essential financial management skills for small businesses',
    downloadCount: 456,
    date: '2024-01-01',
    author: 'Training Team',
    fileSize: 'Online',
    isPremium: true
  }
];

const webinars = [
  {
    id: 1,
    title: 'Navigating PACRA Compliance in 2024',
    date: '2024-02-15',
    time: '14:00 CAT',
    presenter: 'Sarah Mwanza',
    attendees: 156,
    status: 'upcoming'
  },
  {
    id: 2,
    title: 'Risk Management for Growing Businesses',
    date: '2024-02-08',
    time: '15:30 CAT',
    presenter: 'James Banda',
    attendees: 89,
    status: 'completed'
  },
  {
    id: 3,
    title: 'Legal Essentials for Startups',
    date: '2024-02-22',
    time: '13:00 CAT',
    presenter: 'Grace Phiri',
    attendees: 234,
    status: 'upcoming'
  }
];

const Resources = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all-categories');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all-categories' || resource.category === selectedCategory;
    const matchesPremium = !showPremiumOnly || resource.isPremium;
    return matchesSearch && matchesCategory && matchesPremium;
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHero
          title="Business Resources"
          description="Tools, templates, and knowledge to grow your business"
          backgroundImage={heroResources}
        >
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              variant={activeTab === 'documents' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('documents')}
              className="text-lg px-8"
            >
              Documents & Templates
            </Button>
            <Button 
              variant={activeTab === 'webinars' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('webinars')}
              className="text-lg px-8"
            >
              Webinars & Training
            </Button>
            <Button 
              variant={activeTab === 'tools' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('tools')}
              className="text-lg px-8"
            >
              Business Tools
            </Button>
          </div>
        </PageHero>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {activeTab === 'documents' && (
            <div>
              <div className="flex gap-4 mb-8 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">All Categories</SelectItem>
                    <SelectItem value="Governance">Governance</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Business Development">Business Development</SelectItem>
                    <SelectItem value="Risk Management">Risk Management</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant={showPremiumOnly ? 'default' : 'outline'}
                  onClick={() => setShowPremiumOnly(!showPremiumOnly)}
                >
                  Premium Only
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={resource.isPremium ? 'default' : 'secondary'}>
                          {resource.isPremium ? 'Premium' : 'Free'}
                        </Badge>
                        <Badge variant="outline">{resource.type}</Badge>
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">{resource.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{resource.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(resource.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{resource.fileSize}</span>
                          <span>{resource.downloadCount} downloads</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'webinars' && (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Webinars & Training Sessions</h2>
                <p className="text-muted-foreground">Learn from industry experts and stay updated with latest trends</p>
              </div>
              
              <div className="space-y-6">
                {webinars.map((webinar) => (
                  <Card key={webinar.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold">{webinar.title}</h3>
                            <Badge variant={webinar.status === 'upcoming' ? 'default' : 'secondary'}>
                              {webinar.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(webinar.date).toLocaleDateString()} at {webinar.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{webinar.presenter}</span>
                            </div>
                            <span>{webinar.attendees} attendees</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button variant={webinar.status === 'upcoming' ? 'default' : 'outline'}>
                            {webinar.status === 'upcoming' ? 'Register' : 'Watch Recording'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-8">Business Tools & Calculators</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-4">Compliance Calendar</h3>
                  <p className="text-muted-foreground mb-6">
                    Track all your regulatory filing deadlines and requirements
                  </p>
                  <Button>Access Tool</Button>
                </Card>
                
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-bold mb-4">Financial Calculator</h3>
                  <p className="text-muted-foreground mb-6">
                    Calculate loan payments, ROI, and other financial metrics
                  </p>
                  <Button>Use Calculator</Button>
                </Card>
                
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">⚖️</div>
                  <h3 className="text-xl font-bold mb-4">Risk Assessment Tool</h3>
                  <p className="text-muted-foreground mb-6">
                    Evaluate and score business risks with our interactive tool
                  </p>
                  <Button>Start Assessment</Button>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Resources;
