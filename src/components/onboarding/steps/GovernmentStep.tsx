import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from '../FormSection';
import { TagMultiSelect } from '../TagMultiSelect';
import { GovernmentProfileData } from '@/lib/validations/onboarding';
import {
  institutionTypes,
  mandateAreas,
  collaborationInterests,
  contactTitles
} from '@/data/onboardingOptions';

interface GovernmentStepProps {
  form: UseFormReturn<GovernmentProfileData>;
}

export function GovernmentStep({ form }: GovernmentStepProps) {
  return (
    <div className="space-y-6">
      <FormSection 
        title="Institution Information" 
        description="Tell us about your government institution"
      >
        <FormField
          control={form.control}
          name="institution_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Institution Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ministry of Commerce, Trade and Industry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="department_or_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department / Unit *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., SME Development Division" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="institution_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutionTypes.map(type => (
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
        </div>

        <FormField
          control={form.control}
          name="contact_person_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Title *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your title" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contactTitles.map(title => (
                    <SelectItem key={title} value={title}>
                      {title}
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
        title="Mandate & Services" 
        description="What does your institution do?"
      >
        <FormField
          control={form.control}
          name="mandate_areas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mandate Areas *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={mandateAreas}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select mandate areas"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="services_or_programmes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services / Programmes Offered *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the services or programmes your institution offers..."
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
        title="Collaboration" 
        description="How would you like to collaborate with the private sector?"
      >
        <FormField
          control={form.control}
          name="collaboration_interests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Collaboration Interests *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={collaborationInterests}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select collaboration interests"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Additional Information" 
        description="Optional details"
      >
        <FormField
          control={form.control}
          name="procurement_portal_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Procurement Portal URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://procurement.gov.zm" 
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
          name="current_initiatives"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Initiatives</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe current initiatives or programs..."
                  className="min-h-[60px] resize-none"
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
          name="eligibility_criteria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eligibility Criteria</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="What are the eligibility criteria for your programmes?"
                  className="min-h-[60px] resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>Help SMEs understand if they qualify</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}
