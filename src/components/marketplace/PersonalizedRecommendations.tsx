import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, TrendingUp, Users, Clock, Star, ArrowRight, 
  Target, Zap, Heart, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Recommendation {
  id: string;
  type: 'product' | 'service' | 'professional';
  title: string;
  description: string;
  price: number;
  currency: string;
  rating: number;
  image: string;
  reason: string;
  confidence: number;
  provider?: string;
  category?: string;
  tags?: string[];
}

interface UserProfile {
  account_type: string | null;
  industry_sector: string | null;
  preferred_sectors: string[] | null;
  skills: string[] | null;
  business_name: string | null;
}

interface PersonalizedRecommendationsProps {
  onSelectRecommendation: (recommendation: Recommendation) => void;
}

const PersonalizedRecommendations = ({ onSelectRecommendation }: PersonalizedRecommendationsProps) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'new'>('for-you');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      fetchRecommendations();
    }
  }, [user, activeTab]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_type, industry_sector, preferred_sectors, skills, business_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
      fetchRecommendations(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      fetchRecommendations();
    }
  };

  const fetchRecommendations = async (profile?: UserProfile) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: {
          type: 'personalized_recommendations',
          userProfile: profile || userProfile,
          recommendationType: activeTab,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        // Fallback with enhanced mock data
        setRecommendations(getMockRecommendations(profile));
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations(getMockRecommendations(userProfile || undefined));
    } finally {
      setIsLoading(false);
    }
  };

  const getMockRecommendations = (profile?: UserProfile): Recommendation[] => {
    const baseRecommendations: Recommendation[] = [
      {
        id: '1',
        type: 'service',
        title: 'Business Registration & PACRA Filing',
        description: 'Complete business registration with PACRA, including name reservation and certificate processing',
        price: 1500,
        currency: 'ZMW',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
        reason: profile?.account_type === 'sme' ? 'Essential for your business setup' : 'Popular among new businesses',
        confidence: 0.95,
        provider: 'Zambia Business Services',
        category: 'Legal',
        tags: ['Registration', 'PACRA', 'Legal']
      },
      {
        id: '2',
        type: 'professional',
        title: 'Expert Tax Consultant',
        description: 'Certified tax advisor specializing in SME compliance and ZRA filings',
        price: 350,
        currency: 'ZMW',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=300&fit=crop',
        reason: 'Highly rated in your area',
        confidence: 0.88,
        provider: 'Sarah Mwanza, CPA',
        category: 'Accounting',
        tags: ['Tax', 'ZRA', 'Compliance']
      },
      {
        id: '3',
        type: 'service',
        title: 'Digital Marketing Package',
        description: 'Complete digital presence setup including social media, SEO, and Google Business',
        price: 2500,
        currency: 'ZMW',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
        reason: 'Boost your online visibility',
        confidence: 0.82,
        provider: 'DigiGrowth Agency',
        category: 'Marketing',
        tags: ['Digital', 'Social Media', 'SEO']
      },
      {
        id: '4',
        type: 'service',
        title: 'Business Plan Development',
        description: 'Professional business plan creation for funding applications and strategic planning',
        price: 3000,
        currency: 'ZMW',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
        reason: profile?.account_type === 'sme' ? 'Perfect for funding applications' : 'Strategic planning essential',
        confidence: 0.90,
        provider: 'BizPlan Pro',
        category: 'Consulting',
        tags: ['Business Plan', 'Strategy', 'Funding']
      },
      {
        id: '5',
        type: 'professional',
        title: 'IT Solutions Specialist',
        description: 'Full-stack developer and IT consultant for business automation and systems',
        price: 500,
        currency: 'ZMW',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
        reason: 'Automate your business processes',
        confidence: 0.78,
        provider: 'TechSolutions ZM',
        category: 'IT Services',
        tags: ['Development', 'Automation', 'Systems']
      },
      {
        id: '6',
        type: 'service',
        title: 'Legal Compliance Audit',
        description: 'Comprehensive review of your business legal compliance and documentation',
        price: 2000,
        currency: 'ZMW',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop',
        reason: 'Ensure your business is fully compliant',
        confidence: 0.85,
        provider: 'LegalEase Zambia',
        category: 'Legal',
        tags: ['Legal', 'Compliance', 'Audit']
      }
    ];

    return baseRecommendations;
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'for-you': return <Target className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'new': return <Zap className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const featuredRecs = recommendations.slice(0, 3);
  const otherRecs = recommendations.slice(3);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredRecs.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredRecs.length) % featuredRecs.length);
  };

  return (
    <div className="space-y-8">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {user ? 'Recommended For You' : 'Popular Services'}
          </h2>
          {userProfile?.business_name && (
            <p className="text-muted-foreground mt-1">
              Personalized picks for <span className="font-medium text-foreground">{userProfile.business_name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2 bg-muted/50 rounded-lg p-1">
          {(['for-you', 'trending', 'new'] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={`capitalize rounded-md ${activeTab === tab ? 'shadow-sm' : ''}`}
            >
              {getTabIcon(tab)}
              <span className="ml-1.5 hidden sm:inline">
                {tab === 'for-you' ? 'For You' : tab}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Featured Carousel */}
      {isLoading ? (
        <div className="relative">
          <Skeleton className="w-full h-64 rounded-2xl" />
        </div>
      ) : featuredRecs.length > 0 && (
        <div className="relative group">
          <div className="overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {featuredRecs.map((rec) => (
                <div key={rec.id} className="w-full flex-shrink-0">
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-2 gap-0">
                        <div className="relative h-48 md:h-64">
                          <img
                            src={rec.image}
                            alt={rec.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/90 md:block hidden" />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary/90 text-primary-foreground shadow-lg">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              {rec.rating}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-6 flex flex-col justify-center relative">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {rec.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              {Math.round(rec.confidence * 100)}% match
                            </Badge>
                          </div>
                          <h3 className="text-xl font-bold mb-2">{rec.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{rec.description}</p>
                          <p className="text-xs text-primary flex items-center gap-1 mb-4">
                            <Sparkles className="w-3 h-3" />
                            {rec.reason}
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-bold text-primary">{rec.currency} {rec.price.toLocaleString()}</span>
                              <p className="text-xs text-muted-foreground">{rec.provider}</p>
                            </div>
                            <Button onClick={() => onSelectRecommendation(rec)} className="group/btn">
                              View Details
                              <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {/* Carousel Controls */}
          {featuredRecs.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={prevSlide}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={nextSlide}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              {/* Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {featuredRecs.map((_, idx) => (
                  <button
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentSlide === idx ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                    }`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* More Recommendations Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          More Services You Might Like
        </h3>
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <Skeleton className="h-40 rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherRecs.map(rec => (
              <Card 
                key={rec.id} 
                className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => onSelectRecommendation(rec)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={rec.image}
                    alt={rec.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {rec.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-current" />
                      {rec.rating}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</h4>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{rec.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-primary">{rec.currency} {rec.price.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {Math.round(rec.confidence * 100)}% match
                    </div>
                  </div>
                  {rec.tags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rec.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Save for Later CTA */}
      {user && (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Save Your Favorites</h4>
                <p className="text-sm text-muted-foreground">Bookmark services to review later</p>
              </div>
            </div>
            <Button variant="outline">View Saved Items</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonalizedRecommendations;
