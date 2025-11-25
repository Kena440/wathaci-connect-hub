import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import {
  getProfessionalProfile,
  upsertProfessionalProfile,
  uploadProfileMedia,
} from '@/lib/api/profile-onboarding';
import { supabaseClient } from '@/lib/supabaseClient';
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from 'lucide-react';

const primaryExpertiseOptions = [
  'Financial Modelling',
  'Grants & Proposal Writing',
  'Legal & Compliance',
  'Marketing Strategy',
  'HR & Organisation Design',
  'Digital Transformation',
  'Tax & Compliance Advisory',
  'Investment Readiness Coaching',
  'Business Strategy',
  'Operational Excellence',
];

const sectorOptions = [
  'Agriculture',
  'Retail',
  'Manufacturing',
  'Tech & Digital',
  'Logistics',
  'Hospitality',
  'Healthcare',
  'Education',
];

const servicesOptions = [
  'Business Strategy',
  'Financial Modelling & Projections',
  'Grant/Proposal Writing',
  'Investment Readiness Coaching',
  'Tax & Compliance Advisory',
  'HR & Organisation Design',
  'Marketing & Branding',
  'Digital Systems / ERP Setup',
  'Legal Documentation',
];

const yearsOptions = [
  { label: '0-2 years', value: 2 },
  { label: '3-5 years', value: 5 },
  { label: '6-10 years', value: 10 },
  { label: '11-15 years', value: 15 },
  { label: '16+ years', value: 16 },
];

const availabilityOptions = [
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'occasional', label: 'Occasional' },
];

const professionalSchema = z
  .object({
    entity_type: z.enum(['individual', 'firm', 'company']),
    full_name: z.string().min(2, 'Full name is required'),
    organisation_name: z.string().optional(),
    bio: z
      .string()
      .min(1, 'Professional bio is required')
      .refine((val) => {
        const words = val.trim().split(/\s+/).filter(Boolean).length;
        return words >= 100 && words <= 250;
      }, 'Bio should be between 100 and 250 words'),
    primary_expertise: z.array(z.string()).min(3, 'Select at least 3 primary areas').max(5, 'Choose up to 5 areas'),
    secondary_skills: z.array(z.string()).optional(),
    years_of_experience: z.number().min(0, 'Years of experience is required'),
    current_organisation: z.string().optional(),
    qualifications: z.string().optional(),
    top_sectors: z.array(z.string()).min(1, 'Choose at least one sector').max(3, 'Choose up to 3 sectors'),
    notable_projects: z.string().optional(),
    services_offered: z.array(z.string()).min(1, 'Select at least one service you offer'),
    other_services: z.string().optional(),
    expected_rates: z.string().optional(),
    location_city: z.string().min(1, 'City is required'),
    location_country: z.string().min(1, 'Country is required'),
    phone: z.string().min(4, 'Phone number is required'),
    email: z.string().email('Provide a valid email'),
    linkedin_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
    website_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
    portfolio_url: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
    availability: z.enum(['part_time', 'full_time', 'occasional']),
    notes: z.string().optional(),
    profile_photo_url: z.string().optional(),
    logo_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.entity_type !== 'individual' && !data.organisation_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organisation_name'],
        message: 'Please provide the firm or company name.',
      });
    }
  });

const wordCount = (text?: string) => text?.trim().split(/\s+/).filter(Boolean).length ?? 0;

type ProfessionalFormValues = z.infer<typeof professionalSchema>;

export const ProfessionalOnboardingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAppContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      entity_type: 'individual',
      full_name: profile?.full_name ?? '',
      organisation_name: '',
      bio: '',
      primary_expertise: [],
      secondary_skills: [],
      years_of_experience: 2,
      current_organisation: '',
      qualifications: '',
      top_sectors: [],
      notable_projects: '',
      services_offered: [],
      other_services: '',
      expected_rates: '',
      location_city: '',
      location_country: 'Zambia',
      phone: profile?.phone ?? '',
      email: user?.email ?? '',
      linkedin_url: '',
      website_url: '',
      portfolio_url: '',
      availability: 'part_time',
      notes: '',
      profile_photo_url: '',
      logo_url: '',
    },
    mode: 'onChange',
  });

  const { watch, setValue, handleSubmit, reset, trigger, formState } = form;

  const watchedEntityType = watch('entity_type');
  const watchedBio = watch('bio');

  const expertiseSelection = watch('primary_expertise') || [];
  const secondarySelection = watch('secondary_skills') || [];
  const sectorSelection = watch('top_sectors') || [];
  const servicesSelection = watch('services_offered') || [];

  const totalSteps = 4;
  const progress = useMemo(() => Math.round((currentStep / totalSteps) * 100), [currentStep]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const existing = await getProfessionalProfile();
        if (existing) {
          reset({
            entity_type: (existing.entity_type as ProfessionalFormValues['entity_type']) || 'individual',
            full_name: existing.full_name || '',
            organisation_name: existing.organisation_name || '',
            bio: existing.bio || '',
            primary_expertise: existing.primary_expertise || [],
            secondary_skills: existing.secondary_skills || [],
            years_of_experience: existing.years_of_experience ?? 2,
            current_organisation: existing.current_organisation || '',
            qualifications: existing.qualifications || '',
            top_sectors: existing.top_sectors || [],
            notable_projects: existing.notable_projects || '',
            services_offered: existing.services_offered || [],
            other_services: '',
            expected_rates: existing.expected_rates || '',
            location_city: existing.location_city || '',
            location_country: existing.location_country || 'Zambia',
            phone: existing.phone || profile?.phone || '',
            email: existing.email || user?.email || '',
            linkedin_url: existing.linkedin_url || '',
            website_url: existing.website_url || '',
            portfolio_url: existing.portfolio_url || '',
            availability: (existing.availability as ProfessionalFormValues['availability']) || 'part_time',
            notes: existing.notes || '',
            profile_photo_url: existing.profile_photo_url || '',
            logo_url: existing.logo_url || '',
          });

          if (existing.profile_photo_url) {
            const signed = await createSignedPreview(existing.profile_photo_url);
            setPhotoPreview(signed || undefined);
          }
          if (existing.logo_url) {
            const signed = await createSignedPreview(existing.logo_url);
            setLogoPreview(signed || undefined);
          }
        }
      } catch (error: any) {
        console.error('Failed to load professional profile', error);
        toast({
          title: 'Unable to load profile',
          description: error.message || 'Please try again shortly.',
          variant: 'destructive',
        });
      } finally {
        setInitializing(false);
      }
    };

    loadProfile();
  }, [profile?.phone, reset, toast, user?.email]);

  const createSignedPreview = async (storedPath: string) => {
    const cleanedPath = storedPath.replace(/^profile-media\//, '');
    const { data, error } = await supabaseClient.storage
      .from('profile-media')
      .createSignedUrl(cleanedPath, 60 * 60 * 24);
    if (error) {
      return null;
    }
    return data?.signedUrl ?? null;
  };

  const toggleValue = (
    field: 'primary_expertise' | 'secondary_skills' | 'top_sectors' | 'services_offered',
    value: string,
    max?: number
  ) => {
    const current = (watch(field) || []) as string[];
    const exists = current.includes(value);
    let next = exists ? current.filter((item) => item !== value) : [...current, value];

    if (!exists && max && next.length > max) {
      toast({
        title: 'Selection limit reached',
        description: `You can select up to ${max} options here.`,
        variant: 'destructive',
      });
      return;
    }

    setValue(field, next, { shouldValidate: true });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      const label = type === 'photo' ? 'profile-photo' : 'logo';
      const { path, signedUrl } = await uploadProfileMedia(
        file,
        user.id,
        `profiles/professionals/${user.id}`,
        label
      );

      if (type === 'photo') {
        setValue('profile_photo_url', path, { shouldValidate: true });
        setPhotoPreview(signedUrl || path);
      } else {
        setValue('logo_url', path, { shouldValidate: true });
        setLogoPreview(signedUrl || path);
      }

      toast({
        title: 'Upload successful',
        description: 'Your media has been uploaded securely.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleNext = async () => {
    const stepFields: Record<number, Array<keyof ProfessionalFormValues>> = {
      1: ['entity_type', 'full_name', 'organisation_name', 'bio'],
      2: ['primary_expertise', 'top_sectors', 'years_of_experience'],
      3: ['services_offered', 'location_city', 'location_country', 'phone', 'email'],
      4: ['availability'],
    };
    const fieldsToValidate = stepFields[currentStep] || [];
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveProfile = async (data: ProfessionalFormValues, stayOnPage?: boolean) => {
    setLoading(true);
    try {
      const services = data.other_services?.trim()
        ? [...data.services_offered, data.other_services.trim()]
        : data.services_offered;

      await upsertProfessionalProfile({
        ...data,
        services_offered: services,
        organisation_name: data.entity_type === 'individual' ? data.organisation_name || null : data.organisation_name || data.full_name,
        current_organisation: data.entity_type === 'individual' ? data.current_organisation || null : data.current_organisation || data.organisation_name || null,
      });

      toast({
        title: 'Your professional profile has been saved.',
        description: 'SMEs will soon be able to discover and work with you.',
      });

      if (!stayOnPage) {
        navigate('/professional-assessment?view=results');
      }
    } catch (error: any) {
      toast({
        title: 'Unable to save profile',
        description: error.message || 'Please check your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = handleSubmit((data) => saveProfile(data, false));
  const handleSaveForLater = handleSubmit((data) => saveProfile(data, true));

  const bioWords = useMemo(() => wordCount(watchedBio), [watchedBio]);

  const entityOrganisationLabel =
    watchedEntityType === 'individual' ? 'Current Organisation (optional)' : 'Firm / Company Name';

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your Professional Profile</h1>
          <p className="text-gray-700">
            This helps SMEs and partners understand your expertise and how to work with you.
          </p>
        </div>

        <div className="mb-6 space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Basic information'}
                {currentStep === 2 && 'Expertise & sectors'}
                {currentStep === 3 && 'Services, rates & location'}
                {currentStep === 4 && 'Links, availability & branding'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Tell us who you are and how to present your profile.'}
                {currentStep === 2 && 'Highlight the areas you excel in.'}
                {currentStep === 3 && 'Describe what you offer and where you work from.'}
                {currentStep === 4 && 'Share your availability and public links.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">What type of professional entity are you?</Label>
                    <RadioGroup
                      value={watchedEntityType}
                      onValueChange={(value) => setValue('entity_type', value as ProfessionalFormValues['entity_type'], { shouldValidate: true })}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    >
                      {['individual', 'firm', 'company'].map((option) => (
                        <Label
                          key={option}
                          className={`border rounded-lg px-4 py-3 cursor-pointer flex items-center gap-3 ${watchedEntityType === option ? 'border-primary bg-orange-50' : ''}`}
                        >
                          <RadioGroupItem value={option} />
                          <span className="capitalize">{option}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" placeholder="e.g. Thandiwe Phiri" {...form.register('full_name')} />
                      {formState.errors.full_name && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.full_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="organisation_name">{entityOrganisationLabel}</Label>
                      <Input id="organisation_name" placeholder="e.g. Ama Mensah Consulting" {...form.register('organisation_name')} />
                      {formState.errors.organisation_name && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.organisation_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bio">Professional Bio (100–200 words)</Label>
                      <span className="text-xs text-gray-500">{bioWords} words</span>
                    </div>
                    <Textarea
                      id="bio"
                      rows={6}
                      placeholder="Summarise who you are, your experience, and the type of work you do with SMEs (100–200 words)."
                      {...form.register('bio')}
                    />
                    {formState.errors.bio && <p className="text-sm text-red-600 mt-1">{formState.errors.bio.message as string}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="profile_photo">Upload Photo (Profile Picture)</Label>
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" className="flex items-center gap-2" asChild>
                          <label htmlFor="profile_photo_input" className="cursor-pointer flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            {photoPreview ? 'Change photo' : 'Upload photo'}
                          </label>
                        </Button>
                        {photoPreview && <img src={photoPreview} alt="Profile preview" className="h-12 w-12 rounded-full object-cover" />}
                      </div>
                      <Input
                        id="profile_photo_input"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleUpload(e, 'photo')}
                      />
                    </div>
                    {watchedEntityType !== 'individual' && (
                      <div>
                        <Label htmlFor="logo_upload">Upload Logo</Label>
                        <div className="flex items-center gap-3">
                          <Button type="button" variant="outline" className="flex items-center gap-2" asChild>
                            <label htmlFor="logo_upload_input" className="cursor-pointer flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              {logoPreview ? 'Change logo' : 'Upload logo'}
                            </label>
                          </Button>
                          {logoPreview && <img src={logoPreview} alt="Logo preview" className="h-12 w-12 rounded object-cover border" />}
                        </div>
                        <Input
                          id="logo_upload_input"
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleUpload(e, 'logo')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Primary Expertise Areas (3–5)</Label>
                    <p className="text-sm text-gray-500 mb-2">Select your strongest areas.</p>
                    <div className="flex flex-wrap gap-2">
                      {primaryExpertiseOptions.map((option) => {
                        const selected = expertiseSelection.includes(option);
                        return (
                          <Badge
                            key={option}
                            variant={selected ? 'default' : 'outline'}
                            className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                            onClick={() => toggleValue('primary_expertise', option, 5)}
                          >
                            {selected && <Check className="h-3 w-3 mr-1" />} {option}
                          </Badge>
                        );
                      })}
                    </div>
                    {formState.errors.primary_expertise && (
                      <p className="text-sm text-red-600 mt-1">{formState.errors.primary_expertise.message as string}</p>
                    )}
                  </div>

                  <div>
                    <Label>Secondary Skills (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {primaryExpertiseOptions.map((option) => {
                        const selected = secondarySelection.includes(option);
                        return (
                          <Badge
                            key={option}
                            variant={selected ? 'default' : 'outline'}
                            className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                            onClick={() => toggleValue('secondary_skills', option)}
                          >
                            {selected && <Check className="h-3 w-3 mr-1" />} {option}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="years_of_experience">Years of Experience</Label>
                      <Select
                        value={String(watch('years_of_experience'))}
                        onValueChange={(value) => setValue('years_of_experience', Number(value), { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearsOptions.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formState.errors.years_of_experience && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.years_of_experience.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Top 3 Sectors Served</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sectorOptions.map((sector) => {
                          const selected = sectorSelection.includes(sector);
                          return (
                            <Badge
                              key={sector}
                              variant={selected ? 'default' : 'outline'}
                              className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                              onClick={() => toggleValue('top_sectors', sector, 3)}
                            >
                              {selected && <Check className="h-3 w-3 mr-1" />} {sector}
                            </Badge>
                          );
                        })}
                      </div>
                      {formState.errors.top_sectors && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.top_sectors.message as string}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="qualifications">Professional Qualifications / Certifications</Label>
                    <Textarea
                      id="qualifications"
                      rows={3}
                      placeholder="e.g. ACCA, MBA, PMP"
                      {...form.register('qualifications')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="current_organisation">Current Organisation (if applicable)</Label>
                    <Input
                      id="current_organisation"
                      placeholder="Employer or brand name"
                      {...form.register('current_organisation')}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label>Services You Can Offer to SMEs</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {servicesOptions.map((service) => {
                        const selected = servicesSelection.includes(service);
                        return (
                          <Badge
                            key={service}
                            variant={selected ? 'default' : 'outline'}
                            className={`cursor-pointer px-3 py-2 text-sm ${selected ? 'bg-primary text-white' : ''}`}
                            onClick={() => toggleValue('services_offered', service)}
                          >
                            {selected && <Check className="h-3 w-3 mr-1" />} {service}
                          </Badge>
                        );
                      })}
                    </div>
                    {formState.errors.services_offered && (
                      <p className="text-sm text-red-600 mt-1">{formState.errors.services_offered.message as string}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="other_services">Other services (optional)</Label>
                      <Input
                        id="other_services"
                        placeholder="Add any additional services"
                        {...form.register('other_services')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expected_rates">Expected Hourly/Project Rates (optional)</Label>
                      <Input id="expected_rates" placeholder="e.g. ZMW 500/hr" {...form.register('expected_rates')} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notable_projects">Notable Achievements / Projects</Label>
                    <Textarea
                      id="notable_projects"
                      rows={4}
                      placeholder="Mention 2–3 key achievements or projects (e.g. helped an SME secure ZMW X in funding)"
                      {...form.register('notable_projects')}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location_city">Location (City)</Label>
                      <Input id="location_city" placeholder="e.g. Lusaka" {...form.register('location_city')} />
                      {formState.errors.location_city && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.location_city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="location_country">Location (Country)</Label>
                      <Input id="location_country" placeholder="Zambia" {...form.register('location_country')} />
                      {formState.errors.location_country && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.location_country.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="e.g. +260..." {...form.register('phone')} />
                      {formState.errors.phone && <p className="text-sm text-red-600 mt-1">{formState.errors.phone.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" {...form.register('email')} />
                      {formState.errors.email && <p className="text-sm text-red-600 mt-1">{formState.errors.email.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label>Availability</Label>
                    <Select
                      value={watch('availability')}
                      onValueChange={(value) => setValue('availability', value as ProfessionalFormValues['availability'], { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        {availabilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formState.errors.availability && (
                      <p className="text-sm text-red-600 mt-1">{formState.errors.availability.message}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input id="linkedin_url" placeholder="https://linkedin.com/in/username" {...form.register('linkedin_url')} />
                      {formState.errors.linkedin_url && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.linkedin_url.message as string}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input id="website_url" placeholder="https://" {...form.register('website_url')} />
                      {formState.errors.website_url && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.website_url.message as string}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="portfolio_url">Portfolio URL</Label>
                      <Input id="portfolio_url" placeholder="https://" {...form.register('portfolio_url')} />
                      {formState.errors.portfolio_url && (
                        <p className="text-sm text-red-600 mt-1">{formState.errors.portfolio_url.message as string}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="notes">Any Additional Notes</Label>
                      <Textarea id="notes" rows={3} placeholder="Preferences or SME types you enjoy working with" {...form.register('notes')} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

            <div className="flex items-center justify-between">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" disabled={loading} onClick={handleSaveForLater}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Save & Continue Later'}
                </Button>
                {currentStep < totalSteps && (
                  <Button type="button" onClick={handleNext}>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                {currentStep === totalSteps && (
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Save profile'}
                  </Button>
                )}
              </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfessionalOnboardingPage;
