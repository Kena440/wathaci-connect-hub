import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { getSmeProfile, upsertSmeProfile, uploadProfileMedia } from '@/lib/api/profile-onboarding';
import { ArrowLeft, Loader2, Upload, Check } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import OnboardingGraceBanner from '@/components/OnboardingGraceBanner';

const challenges = [
  'Access to finance',
  'Marketing and sales',
  'Hiring and HR',
  'Systems and processes',
  'Compliance and legal',
  'Technology and automation',
];

const supportAreas = [
  'Investment readiness',
  'Grant applications',
  'Financial modelling',
  'Market expansion',
  'Digital transformation',
  'People and culture',
];

const smeSchema = z.object({
  business_name: z.string().min(2, 'Business name is required'),
  registration_number: z.string().optional(),
  registration_type: z.string().optional(),
  sector: z.string().optional(),
  subsector: z.string().optional(),
  years_in_operation: z.number().int().min(0).optional(),
  employee_count: z.number().int().min(0).optional(),
  turnover_bracket: z.string().optional(),
  products_overview: z.string().optional(),
  target_market: z.string().optional(),
  location_city: z.string().min(1, 'City is required'),
  location_country: z.string().min(1, 'Country is required'),
  contact_name: z.string().min(1, 'Contact person is required'),
  contact_phone: z.string().min(4, 'Phone number is required'),
  business_email: z.string().email('Enter a valid email'),
  website_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
  social_links: z.string().optional(),
  main_challenges: z.array(z.string()).optional(),
  support_needs: z.array(z.string()).optional(),
  logo_url: z.string().optional(),
});

type SmeFormValues = z.infer<typeof smeSchema>;

export const SmeOnboardingPage = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  const form = useForm<SmeFormValues>({
    resolver: zodResolver(smeSchema),
    defaultValues: {
      business_name: '',
      registration_number: '',
      registration_type: '',
      sector: '',
      subsector: '',
      years_in_operation: undefined,
      employee_count: undefined,
      turnover_bracket: '',
      products_overview: '',
      target_market: '',
      location_city: '',
      location_country: 'Zambia',
      contact_name: '',
      contact_phone: '',
      business_email: user?.email || '',
      website_url: '',
      social_links: '',
      main_challenges: [],
      support_needs: [],
      logo_url: '',
    },
    mode: 'onChange',
  });

  const { register, setValue, watch, formState, handleSubmit, reset } = form;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const existing = await getSmeProfile();
        if (existing) {
          reset({
            business_name: existing.business_name,
            registration_number: existing.registration_number || '',
            registration_type: existing.registration_type || '',
            sector: existing.sector || '',
            subsector: existing.subsector || '',
            years_in_operation: existing.years_in_operation ?? undefined,
            employee_count: existing.employee_count ?? undefined,
            turnover_bracket: existing.turnover_bracket || '',
            products_overview: existing.products_overview || '',
            target_market: existing.target_market || '',
            location_city: existing.location_city || '',
            location_country: existing.location_country || 'Zambia',
            contact_name: existing.contact_name || '',
            contact_phone: existing.contact_phone || '',
            business_email: existing.business_email || user?.email || '',
            website_url: existing.website_url || '',
            social_links: existing.social_links?.join(', ') || '',
            main_challenges: existing.main_challenges || [],
            support_needs: existing.support_needs || [],
            logo_url: existing.logo_url || '',
          });

          if (existing.logo_url) {
            const signed = await createSignedPreview(existing.logo_url);
            setLogoPreview(signed || undefined);
          }
        }
      } catch (error: any) {
        toast({
          title: 'Unable to load SME profile',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setInitializing(false);
      }
    };

    loadProfile();
  }, [reset, toast, user?.email]);

  const createSignedPreview = async (storedPath: string) => {
    const cleanedPath = storedPath.replace(/^profile-media\//, '');
    const { data } = await supabaseClient.storage
      .from('profile-media')
      .createSignedUrl(cleanedPath, 60 * 60 * 24);
    return data?.signedUrl;
  };

  const toggleArrayValue = (field: 'main_challenges' | 'support_needs', value: string) => {
    const current = (watch(field) || []) as string[];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setValue(field, next, { shouldValidate: true });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      const { path, signedUrl } = await uploadProfileMedia(file, user.id, `profiles/smes/${user.id}`, 'logo');
      setValue('logo_url', path, { shouldValidate: true });
      setLogoPreview(signedUrl || path);
      toast({ title: 'Logo uploaded' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: SmeFormValues, stayOnPage?: boolean) => {
    setLoading(true);
    try {
      await upsertSmeProfile({
        ...data,
        social_links: data.social_links?.split(',').map((link) => link.trim()).filter(Boolean),
      });

      if (user?.id) {
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({ account_type: 'sme', profile_completed: true })
          .eq('id', user.id);

        if (profileUpdateError) {
          console.error('[onboarding] Failed to mark profile complete', profileUpdateError);
        }
      }

      toast({ title: 'SME profile saved', description: 'Your business details have been recorded.' });
      if (!stayOnPage) {
        navigate('/onboarding/sme/needs-assessment');
      }
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your SME Profile</h1>
          <p className="text-gray-700">Share your business details to unlock tailored support and services.</p>
        </div>

        <OnboardingGraceBanner />

        <form onSubmit={handleSubmit((values) => onSubmit(values, false))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>Core details about your organisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input id="business_name" {...register('business_name')} />
                  {formState.errors.business_name && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.business_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="registration_number">Registration Number & Type</Label>
                  <Input id="registration_number" placeholder="Registration number" {...register('registration_number')} />
                  <Input id="registration_type" placeholder="Type (e.g. LLC)" className="mt-2" {...register('registration_type')} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sector">Sector & Subsector</Label>
                  <Input id="sector" placeholder="Sector" {...register('sector')} />
                  <Input id="subsector" placeholder="Subsector" className="mt-2" {...register('subsector')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                  <Label htmlFor="years_in_operation">Years in Operation</Label>
                    <Input
                      id="years_in_operation"
                      type="number"
                      min={0}
                      {...register('years_in_operation', {
                        setValueAs: (value) => (value === '' ? undefined : Number(value)),
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee_count">Number of Employees</Label>
                    <Input
                      id="employee_count"
                      type="number"
                      min={0}
                      {...register('employee_count', {
                        setValueAs: (value) => (value === '' ? undefined : Number(value)),
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="turnover_bracket">Turnover Bracket</Label>
                <Input id="turnover_bracket" placeholder="e.g. ZMW 500k - 1M" {...register('turnover_bracket')} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="products_overview">Products/Services Overview</Label>
                  <Textarea id="products_overview" rows={3} {...register('products_overview')} />
                </div>
                <div>
                  <Label htmlFor="target_market">Target market (local/regional/export)</Label>
                  <Textarea id="target_market" rows={3} {...register('target_market')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operations & Contact</CardTitle>
              <CardDescription>How to reach your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_city">City</Label>
                  <Input id="location_city" {...register('location_city')} />
                  {formState.errors.location_city && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.location_city.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="location_country">Country</Label>
                  <Input id="location_country" {...register('location_country')} />
                  {formState.errors.location_country && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.location_country.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Person Name</Label>
                  <Input id="contact_name" {...register('contact_name')} />
                  {formState.errors.contact_name && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.contact_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" {...register('contact_phone')} />
                  {formState.errors.contact_phone && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.contact_phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input id="business_email" type="email" {...register('business_email')} />
                  {formState.errors.business_email && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.business_email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="website_url">Website / Social Links</Label>
                  <Input id="website_url" placeholder="Website URL" {...register('website_url')} />
                  <Input
                    id="social_links"
                    placeholder="Other links separated by commas"
                    className="mt-2"
                    {...register('social_links')}
                  />
                </div>
              </div>

              <div>
                <Label>Main challenges</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {challenges.map((item) => {
                    const selected = (watch('main_challenges') || []).includes(item);
                    return (
                      <Badge
                        key={item}
                        variant={selected ? 'default' : 'outline'}
                        className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                        onClick={() => toggleArrayValue('main_challenges', item)}
                      >
                        {selected && <Check className="h-3 w-3 mr-1" />} {item}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Support areas you are seeking</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {supportAreas.map((item) => {
                    const selected = (watch('support_needs') || []).includes(item);
                    return (
                      <Badge
                        key={item}
                        variant={selected ? 'default' : 'outline'}
                        className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                        onClick={() => toggleArrayValue('support_needs', item)}
                      >
                        {selected && <Check className="h-3 w-3 mr-1" />} {item}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="logo_upload">Business Logo (optional)</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="logo_upload" className="cursor-pointer flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {logoPreview ? 'Change logo' : 'Upload logo'}
                    </label>
                  </Button>
                  {logoPreview && <img src={logoPreview} alt="Logo preview" className="h-12 w-12 rounded border object-cover" />}
                </div>
                <Input
                  id="logo_upload"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={handleSubmit((values) => onSubmit(values, true))}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Save & Continue Later'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Save and continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmeOnboardingPage;
