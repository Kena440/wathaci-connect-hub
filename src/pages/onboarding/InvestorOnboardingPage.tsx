import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { getInvestorProfile, upsertInvestorProfile, uploadProfileMedia } from '@/lib/api/profile-onboarding';
import { ArrowLeft, Loader2, Upload, Check } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import OnboardingGraceBanner from '@/components/OnboardingGraceBanner';

const investorTypes = ['Angel', 'VC', 'Bank', 'Donor', 'Foundation', 'Development Finance'];
const sectors = ['Agriculture', 'Retail', 'Manufacturing', 'Tech & Digital', 'Healthcare', 'Education', 'Logistics'];
const stages = ['Startup', 'Growth', 'Mature'];
const instruments = ['Equity', 'Debt', 'Grant', 'Revenue Share', 'Convertible'];
const impactFocus = ['Gender', 'Climate', 'Youth', 'SME Inclusion', 'Rural Impact'];

const investorSchema = z.object({
  organisation_name: z.string().min(2, 'Organisation name is required'),
  investor_type: z.string().optional(),
  ticket_size_min: z.number().int().min(0).optional(),
  ticket_size_max: z.number().int().min(0).optional(),
  preferred_sectors: z.array(z.string()).optional(),
  country_focus: z.array(z.string()).optional(),
  stage_preference: z.array(z.string()).optional(),
  instruments: z.array(z.string()).optional(),
  impact_focus: z.array(z.string()).optional(),
  contact_person: z.string().min(1, 'Contact person is required'),
  contact_role: z.string().optional(),
  website_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
  linkedin_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
  logo_url: z.string().optional(),
});

type InvestorFormValues = z.infer<typeof investorSchema>;

export const InvestorOnboardingPage = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  const form = useForm<InvestorFormValues>({
    resolver: zodResolver(investorSchema),
    defaultValues: {
      organisation_name: '',
      investor_type: '',
      ticket_size_min: undefined,
      ticket_size_max: undefined,
      preferred_sectors: [],
      country_focus: [],
      stage_preference: [],
      instruments: [],
      impact_focus: [],
      contact_person: '',
      contact_role: '',
      website_url: '',
      linkedin_url: '',
      logo_url: '',
    },
  });

  const { register, setValue, watch, handleSubmit, reset, formState } = form;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const existing = await getInvestorProfile();
        if (existing) {
          reset({
            organisation_name: existing.organisation_name,
            investor_type: existing.investor_type || '',
            ticket_size_min: existing.ticket_size_min ?? undefined,
            ticket_size_max: existing.ticket_size_max ?? undefined,
            preferred_sectors: existing.preferred_sectors || [],
            country_focus: existing.country_focus || [],
            stage_preference: existing.stage_preference || [],
            instruments: existing.instruments || [],
            impact_focus: existing.impact_focus || [],
            contact_person: existing.contact_person || '',
            contact_role: existing.contact_role || '',
            website_url: existing.website_url || '',
            linkedin_url: existing.linkedin_url || '',
            logo_url: existing.logo_url || '',
          });

          if (existing.logo_url) {
            const signed = await createSignedPreview(existing.logo_url);
            setLogoPreview(signed || undefined);
          }
        }
      } catch (error: any) {
        toast({ title: 'Unable to load investor profile', description: error.message, variant: 'destructive' });
      } finally {
        setInitializing(false);
      }
    };

    loadProfile();
  }, [reset, toast]);

  const createSignedPreview = async (storedPath: string) => {
    const cleanedPath = storedPath.replace(/^profile-media\//, '');
    const { data } = await supabaseClient.storage
      .from('profile-media')
      .createSignedUrl(cleanedPath, 60 * 60 * 24);
    return data?.signedUrl;
  };

  const toggleArrayValue = (
    field: 'preferred_sectors' | 'country_focus' | 'stage_preference' | 'instruments' | 'impact_focus',
    value: string
  ) => {
    const current = (watch(field) || []) as string[];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setValue(field, next, { shouldValidate: true });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      const { path, signedUrl } = await uploadProfileMedia(
        file,
        user.id,
        `profiles/investors/${user.id}`,
        'logo'
      );
      setValue('logo_url', path, { shouldValidate: true });
      setLogoPreview(signedUrl || path);
      toast({ title: 'Logo uploaded' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: InvestorFormValues, stayOnPage?: boolean) => {
    setLoading(true);
    try {
      await upsertInvestorProfile(data);
      if (user?.id) {
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({ account_type: 'investor', profile_completed: true })
          .eq('id', user.id);

        if (profileUpdateError) {
          console.error('[onboarding] Failed to mark investor profile complete', profileUpdateError);
        }
      }
      toast({ title: 'Profile saved', description: 'Your investment preferences have been updated.' });
      if (!stayOnPage) {
        navigate('/onboarding/investor/needs-assessment');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your Investor/Donor Profile</h1>
          <p className="text-gray-700">Tell us about your mandate so we can match you with the right opportunities.</p>
        </div>

        <OnboardingGraceBanner />

        <form onSubmit={handleSubmit((values) => onSubmit(values, false))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation details</CardTitle>
              <CardDescription>Basic profile and ticket sizes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="organisation_name">Organisation / Fund Name</Label>
                  <Input id="organisation_name" {...register('organisation_name')} />
                  {formState.errors.organisation_name && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.organisation_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="investor_type">Investor Type</Label>
                  <Input id="investor_type" list="investor-types" {...register('investor_type')} />
                  <datalist id="investor-types">
                    {investorTypes.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticket_size_min">Ticket Size Range (Min)</Label>
                  <Input
                    id="ticket_size_min"
                    type="number"
                    min={0}
                    {...register('ticket_size_min', {
                      setValueAs: (value) => (value === '' ? undefined : Number(value)),
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="ticket_size_max">Ticket Size Range (Max)</Label>
                  <Input
                    id="ticket_size_max"
                    type="number"
                    min={0}
                    {...register('ticket_size_max', {
                      setValueAs: (value) => (value === '' ? undefined : Number(value)),
                    })}
                  />
                </div>
              </div>

              <div>
                <Label>Preferred Sectors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sectors.map((sector) => {
                    const selected = (watch('preferred_sectors') || []).includes(sector);
                    return (
                      <Badge
                        key={sector}
                        variant={selected ? 'default' : 'outline'}
                        className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                        onClick={() => toggleArrayValue('preferred_sectors', sector)}
                      >
                        {selected && <Check className="h-3 w-3 mr-1" />} {sector}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Country/Region Focus</Label>
                  <Input
                    placeholder="Add countries separated by commas"
                    value={(watch('country_focus') || []).join(', ')}
                    onChange={(e) =>
                      setValue(
                        'country_focus',
                        e.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                        { shouldValidate: true }
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Stage Preference</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stages.map((stage) => {
                      const selected = (watch('stage_preference') || []).includes(stage);
                      return (
                        <Badge
                          key={stage}
                          variant={selected ? 'default' : 'outline'}
                          className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                          onClick={() => toggleArrayValue('stage_preference', stage)}
                        >
                          {selected && <Check className="h-3 w-3 mr-1" />} {stage}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Instruments</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {instruments.map((instrument) => {
                      const selected = (watch('instruments') || []).includes(instrument);
                      return (
                        <Badge
                          key={instrument}
                          variant={selected ? 'default' : 'outline'}
                          className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                          onClick={() => toggleArrayValue('instruments', instrument)}
                        >
                          {selected && <Check className="h-3 w-3 mr-1" />} {instrument}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>Impact Focus</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {impactFocus.map((impact) => {
                      const selected = (watch('impact_focus') || []).includes(impact);
                      return (
                        <Badge
                          key={impact}
                          variant={selected ? 'default' : 'outline'}
                          className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                          onClick={() => toggleArrayValue('impact_focus', impact)}
                        >
                          {selected && <Check className="h-3 w-3 mr-1" />} {impact}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">Contact Person & Role</Label>
                  <Input id="contact_person" placeholder="Name" {...register('contact_person')} />
                  {formState.errors.contact_person && (
                    <p className="text-sm text-red-600 mt-1">{formState.errors.contact_person.message}</p>
                  )}
                  <Input id="contact_role" placeholder="Role" className="mt-2" {...register('contact_role')} />
                </div>
                <div>
                  <Label htmlFor="website_url">Website & LinkedIn</Label>
                  <Input id="website_url" placeholder="Website" {...register('website_url')} />
                  <Input id="linkedin_url" placeholder="LinkedIn" className="mt-2" {...register('linkedin_url')} />
                  {(formState.errors.website_url || formState.errors.linkedin_url) && (
                    <p className="text-sm text-red-600 mt-1">
                      {formState.errors.website_url?.message || formState.errors.linkedin_url?.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="logo_upload">Upload logo (optional)</Label>
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

export default InvestorOnboardingPage;
