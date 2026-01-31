import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from '../FormSection';
import { TagMultiSelect } from '../TagMultiSelect';
import { FreelancerProfileData } from '@/lib/validations/onboarding';
import {
  freelancerSkills,
  experienceLevels,
  availabilityOptions,
  workModes,
  rateTypes,
  rateRanges,
  languages,
  industries
} from '@/data/onboardingOptions';

interface FreelancerStepProps {
  form: UseFormReturn<FreelancerProfileData>;
}

export function FreelancerStep({ form }: FreelancerStepProps) {
  const watchRateType = form.watch('rate_type');

  return (
    <div className="space-y-6">
      <FormSection 
        title="Professional Profile" 
        description="Tell us about your expertise"
      >
        <FormField
          control={form.control}
          name="professional_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professional Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Senior Accountant, Software Developer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primary_skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Skills *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={freelancerSkills}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select your main skills"
                  maxItems={8}
                />
              </FormControl>
              <FormDescription>Select up to 8 skills</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="services_offered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services Offered *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the services you offer to clients..."
                  className="min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Experience & Availability" 
        description="Your experience level and work preferences"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="experience_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience Level *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {experienceLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Availability *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availabilityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="work_mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Mode *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {workModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label} - {mode.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Rates" 
        description="Your pricing structure"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="rate_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rateTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rate_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate Range *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value ?? ''}
                  disabled={!watchRateType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={watchRateType ? "Select rate range" : "Select rate type first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {watchRateType && rateRanges[watchRateType as keyof typeof rateRanges]?.map(range => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection 
        title="Additional Information" 
        description="Optional details to enhance your profile"
      >
        <FormField
          control={form.control}
          name="portfolio_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://yourportfolio.com" 
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="languages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Languages</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={languages}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select languages you speak"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferred_industries"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Industries</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={industries}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select industries you prefer to work with"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="past_clients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notable Past Clients</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="List some of your notable past clients or projects..."
                  className="min-h-[60px] resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}
