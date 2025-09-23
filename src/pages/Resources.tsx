import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Calendar, User, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LencoPayment } from '@/components/LencoPayment';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { resourcePurchaseService } from '@/lib/services';

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
    isPremium: false,
    price: 0
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
    isPremium: false,
    price: 0
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
    isPremium: true,
    price: 50
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
    isPremium: true,
    price: 50
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
    isPremium: false,
    price: 0
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
    isPremium: true,
    price: 75
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
    status: 'upcoming',
    isPremium: true,
    price: 75
  },
  {
    id: 2,
    title: 'Risk Management for Growing Businesses',
    date: '2024-02-08',
    time: '15:30 CAT',
    presenter: 'James Banda',
    attendees: 89,
    status: 'completed',
    isPremium: false,
    price: 0
  },
  {
    id: 3,
    title: 'Legal Essentials for Startups',
    date: '2024-02-22',
    time: '13:00 CAT',
    presenter: 'Grace Phiri',
    attendees: 234,
    status: 'upcoming',
    isPremium: false,
    price: 0
  }
];

const Resources = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all-categories');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedResource, setSelectedResource] = useState<(typeof resources)[number] | null>(null);
  const [selectedWebinar, setSelectedWebinar] = useState<(typeof webinars)[number] | null>(null);
  const { user } = useAppContext();
  const { toast } = useToast();

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all-categories' || resource.category === selectedCategory;
    const matchesPremium = !showPremiumOnly || resource.isPremium;
    return matchesSearch && matchesCategory && matchesPremium;
  });

  const downloadResource = (resource: (typeof resources)[number]) => {
    // Placeholder for actual download logic
    console.log('Downloading resource', resource.title);
  };

  const handleResourcePaymentSuccess = async () => {
    if (selectedResource && user) {
      const { error } = await resourcePurchaseService.recordPurchase(user.id, selectedResource.id);
      if (error) {
        toast({ title: 'Purchase Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Purchase Successful', description: 'You can now download this resource.' });
        downloadResource(selectedResource);
      }
    }
    setSelectedResource(null);
  };

  const handleDownload = async (resource: (typeof resources)[number]) => {
    if (!resource.isPremium) {
      downloadResource(resource);
      return;
    }

    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to purchase this resource.', variant: 'destructive' });
      return;
    }

    const { data: purchased, error } = await resourcePurchaseService.hasPurchased(user.id, resource.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not verify purchase status.', variant: 'destructive' });
      return;
    }

    if (purchased) {
      downloadResource(resource);
    } else {
      setSelectedResource(resource);
    }
  };

  const registerForWebinar = (webinar: (typeof webinars)[number]) => {
    console.log('Registered for webinar', webinar.title);
  };

  const handleWebinarPaymentSuccess = () => {
    if (selectedWebinar) {
      registerForWebinar(selectedWebinar);
    }
    setSelectedWebinar(null);
  };

  const handleRegister = (webinar: (typeof webinars)[number]) => {
    if (webinar.isPremium) {
      setSelectedWebinar(webinar);
    } else {
      registerForWebinar(webinar);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 relative">
        <div 
          className="fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage: "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2002_02_31%20PM.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/70 to-blue-600/70" />
        <div className="relative z-10 py-16 text-white">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold mb-4">Business Resources</h1>
            <p className="text-xl mb-8">Tools, templates, and knowledge to grow your business</p>
            
            <div className="flex justify-center gap-4 mb-8">
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
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 bg-gray-50">
          {activeTab === 'documents' && (
            <div>
              <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
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
                      <p className="text-gray-600 text-sm">{resource.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4 text-sm text-gray-500">
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
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(resource)}>
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
                <p className="text-gray-600">Learn from industry experts and stay updated with latest trends</p>
              </div>
              
              <div className="space-y-6">
                {webinars.map((webinar) => (
                  <Card key={webinar.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-xl font-bold">{webinar.title}</h3>
                            <Badge variant={webinar.status === 'upcoming' ? 'default' : 'secondary'}>
                              {webinar.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-gray-600">
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
                          <Button
                            variant={webinar.status === 'upcoming' ? 'default' : 'outline'}
                            onClick={() => handleRegister(webinar)}
                          >
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
                  <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-4">Compliance Calendar</h3>
                  <p className="text-gray-600 mb-6">
                    Track all your regulatory filing deadlines and requirements
                  </p>
                  <Button>Access Tool</Button>
                </Card>
                
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-bold mb-4">Financial Calculator</h3>
                  <p className="text-gray-600 mb-6">
                    Calculate loan payments, ROI, and other financial metrics
                  </p>
                  <Button>Use Calculator</Button>
                </Card>
                
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">⚖️</div>
                  <h3 className="text-xl font-bold mb-4">Risk Assessment Tool</h3>
                  <p className="text-gray-600 mb-6">
                    Evaluate and score business risks with our interactive tool
                  </p>
                  <Button>Start Assessment</Button>
                </Card>
              </div>
            </div>
          )}
        </div>

        <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Purchase Resource</DialogTitle>
            </DialogHeader>
            {selectedResource && (
              <LencoPayment
                amount={selectedResource.price}
                description={`Access to ${selectedResource.title}`}
                transactionType="resource"
                onSuccess={handleResourcePaymentSuccess}
                onCancel={() => setSelectedResource(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedWebinar} onOpenChange={(open) => !open && setSelectedWebinar(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register for Webinar</DialogTitle>
            </DialogHeader>
            {selectedWebinar && (
              <LencoPayment
                amount={selectedWebinar.price}
                description={`Registration for ${selectedWebinar.title}`}
                transactionType="resource"
                onSuccess={handleWebinarPaymentSuccess}
                onCancel={() => setSelectedWebinar(null)}
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
};

export default Resources;