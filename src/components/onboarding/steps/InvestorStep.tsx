import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from '../FormSection';
import { TagMultiSelect } from '../TagMultiSelect';
import { InvestorProfileData } from '@/lib/validations/onboarding';
import {
  investorTypes,
  ticketSizes,
  investmentStages,
  investorSectors,
  investmentPreferences,
  geoFocusOptions
} from '@/data/onboardingOptions';

interface InvestorStepProps {
  form: UseFormReturn<InvestorProfileData>;
}

export function InvestorStep({ form }: InvestorStepProps) {
  return (
    <div className="space-y-6">
      <FormSection 
        title="Investor Profile" 
        description="Tell us about your investment focus"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="investor_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investor Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investor type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {investorTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} - {type.description}
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
            name="ticket_size_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket Size Range *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ticket size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ticketSizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
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
        title="Investment Focus" 
        description="What stages and sectors interest you?"
      >
        <FormField
          control={form.control}
          name="investment_stage_focus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Stage Focus *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={investmentStages}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select investment stages"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sectors_of_interest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sectors of Interest *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={investorSectors}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select sectors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="investment_preferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Preferences *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={investmentPreferences}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select investment types"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="geo_focus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geographic Focus *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={geoFocusOptions}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select geographic focus"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Additional Details" 
        description="Optional information to help match you with opportunities"
      >
        <FormField
          control={form.control}
          name="thesis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Thesis</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your investment thesis or focus areas..."
                  className="min-h-[80px] resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>What are you looking for in potential investments?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="decision_timeline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision Timeline</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Typical decision timeline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                  <SelectItem value="1 month">1 month</SelectItem>
                  <SelectItem value="2-3 months">2-3 months</SelectItem>
                  <SelectItem value="3-6 months">3-6 months</SelectItem>
                  <SelectItem value="6+ months">6+ months</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="required_documents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Documents</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="What documents do you typically require from investees?"
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
          name="website_override"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund/Organization Website</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://yourfund.com" 
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
