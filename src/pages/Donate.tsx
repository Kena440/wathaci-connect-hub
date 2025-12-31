import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/components/AppLayout';
import { LencoPayment } from '@/components/LencoPayment';
import { 
  Heart, 
  Users, 
  TrendingUp, 
  Briefcase, 
  GraduationCap, 
  Lightbulb,
  HandHeart,
  Globe,
  Target,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import wathciLogo from '@/assets/wathaci-logo.png';

const impactStats = [
  { icon: Users, value: '2,500+', label: 'SMEs Supported' },
  { icon: Briefcase, value: '15,000+', label: 'Jobs Created' },
  { icon: TrendingUp, value: 'K50M+', label: 'Revenue Generated' },
  { icon: GraduationCap, value: '500+', label: 'Training Sessions' },
];

const donationTiers = [
  { 
    amount: 50, 
    label: 'Seed', 
    description: 'Provides training materials for 1 entrepreneur',
    color: 'from-emerald-500 to-green-600'
  },
  { 
    amount: 100, 
    label: 'Sprout', 
    description: 'Funds a business workshop for 5 SMEs',
    color: 'from-blue-500 to-cyan-600'
  },
  { 
    amount: 250, 
    label: 'Growth', 
    description: 'Supports mentorship for 10 entrepreneurs',
    color: 'from-purple-500 to-violet-600'
  },
  { 
    amount: 500, 
    label: 'Flourish', 
    description: 'Enables market access for 25 SMEs',
    color: 'from-orange-500 to-amber-600'
  },
  { 
    amount: 1000, 
    label: 'Empower', 
    description: 'Funds a complete business incubation program',
    color: 'from-rose-500 to-pink-600'
  },
];

const impactAreas = [
  {
    icon: Lightbulb,
    title: 'Business Training',
    description: 'Equipping entrepreneurs with essential skills to start and grow their businesses.'
  },
  {
    icon: HandHeart,
    title: 'Mentorship Programs',
    description: 'Connecting SMEs with experienced business leaders for guidance and support.'
  },
  {
    icon: Globe,
    title: 'Market Access',
    description: 'Opening doors to new markets and connecting SMEs with potential customers.'
  },
  {
    icon: Target,
    title: 'Funding Access',
    description: 'Helping SMEs access loans, grants, and investment opportunities.'
  },
];

export const Donate = () => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;

  const handleDonationSuccess = () => {
    setShowPayment(false);
    setSelectedAmount(null);
    setCustomAmount('');
    setDonorName('');
    setDonorEmail('');
    setMessage('');
  };

  const handleProceedToPayment = () => {
    if (finalAmount && finalAmount >= 10) {
      setShowPayment(true);
    }
  };

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-20 md:py-32">
        <div className="absolute inset-0 bg-primary/20 opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-background/10 backdrop-blur-sm rounded-2xl border border-background/20">
                <img src={wathciLogo} alt="WATHACI" className="h-20 w-auto" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Empower Zambian
              <span className="block text-accent-foreground/90">Entrepreneurs</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Your donation helps build a thriving ecosystem for small and medium enterprises across Zambia. 
              Together, we can create lasting economic change.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-background text-foreground hover:bg-background/90 shadow-elegant text-lg px-8"
                onClick={() => document.getElementById('donate-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Heart className="mr-2 h-5 w-5" />
                Donate Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8"
                onClick={() => document.getElementById('impact-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See Our Impact
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        <Sparkles className="absolute top-20 left-10 h-8 w-8 text-accent/40 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 h-6 w-6 text-primary-foreground/30 animate-pulse delay-150" />
        <Sparkles className="absolute bottom-40 left-1/4 h-5 w-5 text-accent/30 animate-pulse delay-300" />
      </section>

      {/* Impact Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {impactStats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section id="donate-section" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Make a Difference Today
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every Kwacha you donate goes directly towards empowering Zambian entrepreneurs. 
                Choose an amount that works for you.
              </p>
            </div>

            <Card className="shadow-elegant border-border/50">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Choose Your Impact Level</CardTitle>
                <CardDescription>Select a donation tier or enter a custom amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Donation Tiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {donationTiers.map((tier) => (
                    <button
                      key={tier.amount}
                      onClick={() => {
                        setSelectedAmount(tier.amount);
                        setCustomAmount('');
                        setShowPayment(false);
                      }}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden group ${
                        selectedAmount === tier.amount && !customAmount
                          ? 'border-primary bg-primary/5 shadow-glow'
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-foreground">K{tier.amount}</span>
                          {selectedAmount === tier.amount && !customAmount && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="text-sm font-semibold text-primary mb-1">{tier.label}</div>
                        <div className="text-sm text-muted-foreground">{tier.description}</div>
                      </div>
                    </button>
                  ))}

                  {/* Custom Amount */}
                  <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    customAmount ? 'border-primary bg-primary/5 shadow-glow' : 'border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-foreground">Custom Amount</span>
                      {customAmount && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">K</span>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedAmount(null);
                          setShowPayment(false);
                        }}
                        className="pl-8"
                        min="10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Minimum K10</p>
                  </div>
                </div>

                {/* Donor Information */}
                {finalAmount && finalAmount >= 10 && !showPayment && (
                  <div className="space-y-4 p-6 bg-muted/30 rounded-xl">
                    <h3 className="font-semibold text-foreground">Your Information (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="donorName">Name</Label>
                        <Input
                          id="donorName"
                          placeholder="Your name"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="donorEmail">Email</Label>
                        <Input
                          id="donorEmail"
                          type="email"
                          placeholder="Your email"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Leave a Message (Optional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Share why you're supporting Zambian SMEs..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button 
                      onClick={handleProceedToPayment}
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      Proceed to Donate K{finalAmount}
                    </Button>
                  </div>
                )}

                {/* Payment Component */}
                {showPayment && finalAmount && (
                  <div className="p-6 bg-muted/30 rounded-xl">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-primary">K{finalAmount}</div>
                      <p className="text-muted-foreground">Complete your donation below</p>
                    </div>
                    <LencoPayment
                      amount={finalAmount}
                      description="Donation to WATHACI - Supporting Zambian SMEs"
                      donorName={donorName}
                      donorEmail={donorEmail}
                      message={message}
                      onSuccess={handleDonationSuccess}
                      onCancel={() => setShowPayment(false)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Areas */}
      <section id="impact-section" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Where Your Donation Goes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We invest in programs that create lasting impact for entrepreneurs across Zambia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {impactAreas.map((area, index) => (
              <Card key={index} className="group hover:shadow-elegant transition-all duration-300 border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                    <area.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{area.title}</h3>
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Call to Action */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
              <HandHeart className="h-10 w-10" />
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium text-foreground mb-6 italic">
              "Every small business we help grow creates jobs, supports families, and strengthens communities across Zambia."
            </blockquote>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of supporters who believe in the power of entrepreneurship
            </p>
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant"
              onClick={() => document.getElementById('donate-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Heart className="mr-2 h-5 w-5" />
              Become a Supporter
            </Button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Donate;
