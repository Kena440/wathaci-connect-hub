import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import wathciLogo from '@/assets/wathaci-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateInputs = (isSignUp: boolean): boolean => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs(false)) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs(true)) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
        setActiveTab('signin');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! Please check your email to confirm your account.');
    }
  };

  const features = [
    'Connect with verified professionals',
    'Access funding opportunities',
    'Join the business marketplace',
    'Get compliance support',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 pattern-dots opacity-10" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
        
        {/* Decorative Elements - Zambian Flag inspired */}
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-b from-[hsl(142,70%,35%)] via-[hsl(0,75%,50%)] to-[hsl(25,95%,53%)] opacity-20" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-r from-[hsl(142,70%,35%)] via-[hsl(0,75%,50%)] to-[hsl(25,95%,53%)] opacity-10" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-16">
          <Link to="/" className="mb-12">
            <img 
              src={wathciLogo} 
              alt="WATHACI Connect" 
              className="h-20 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </Link>
          
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">
            Grow Your Business
            <span className="block text-accent">in Zambia</span>
          </h1>
          
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-md">
            Join thousands of SMEs, professionals, and investors building the future of Zambian business together.
          </p>
          
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 text-primary-foreground/90 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-accent" />
                </div>
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
          
          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-primary-foreground/20">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-3xl font-bold text-accent">500+</p>
                <p className="text-primary-foreground/70 text-sm">SMEs Registered</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">50+</p>
                <p className="text-primary-foreground/70 text-sm">Investors</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">100+</p>
                <p className="text-primary-foreground/70 text-sm">Professionals</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/">
              <img 
                src={wathciLogo} 
                alt="WATHACI Connect" 
                className="h-16 w-auto mx-auto"
              />
            </Link>
          </div>

          <Card className="border-border/50 shadow-xl bg-card">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-display font-bold text-foreground">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {activeTab === 'signin' 
                  ? 'Sign in to continue to WATHACI Connect' 
                  : 'Join the WATHACI Connect community'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
                  <TabsTrigger 
                    value="signin"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-background border-input focus:border-accent focus:ring-accent"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-foreground font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-background border-input focus:border-accent focus:ring-accent"
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold group" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-foreground font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 bg-background border-input focus:border-accent focus:ring-accent"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-background border-input focus:border-accent focus:ring-accent"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-background border-input focus:border-accent focus:ring-accent"
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold group" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pt-2">
              <div className="text-center text-sm text-muted-foreground">
                By continuing, you agree to our{' '}
                <Link to="/terms-of-service" className="text-accent hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
              </div>
            </CardFooter>
          </Card>
          
          {/* Back to Home Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}