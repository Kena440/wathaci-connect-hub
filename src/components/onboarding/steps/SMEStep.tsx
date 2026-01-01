import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormSection } from '../FormSection';
import { TagMultiSelect } from '../TagMultiSelect';
import { SMEProfileData } from '@/lib/validations/onboarding';
import {
  industries,
  businessStages,
  smeNeeds,
  zambiaProvinces,
  teamSizeRanges,
  revenueRanges,
  fundingRanges,
  supportTypes,
  investorSectors
} from '@/data/onboardingOptions';

interface SMEStepProps {
  form: UseFormReturn<SMEProfileData>;
}

export function SMEStep({ form }: SMEStepProps) {
  const watchFundingNeeded = form.watch('funding_needed');

  return (
    <div className="space-y-6">
      <FormSection 
        title="Business Information" 
        description="Tell us about your business"
      >
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name *</FormLabel>
              <FormControl>
                <Input placeholder="Your Company Ltd" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industries.map(industry => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Stage *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {businessStages.map(stage => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label} - {stage.description}
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
          name="services_or_products"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Products / Services *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your main products or services..."
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
        title="Business Needs" 
        description="What support are you looking for?"
      >
        <FormField
          control={form.control}
          name="top_needs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top Business Needs *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={smeNeeds}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select your top needs"
                  maxItems={5}
                />
              </FormControl>
              <FormDescription>Select up to 5 key needs</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="areas_served"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Areas Served *</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={zambiaProvinces}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select provinces you serve"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Business Details" 
        description="Optional additional information"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="team_size_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Size</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teamSizeRanges.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthly_revenue_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Revenue</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select revenue range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {revenueRanges.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="registration_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="registered">Registered with PACRA</SelectItem>
                    <SelectItem value="pending">Registration Pending</SelectItem>
                    <SelectItem value="unregistered">Not Yet Registered</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="PACRA registration number" 
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection 
        title="Funding Needs" 
        description="Are you looking for funding?"
      >
        <FormField
          control={form.control}
          name="funding_needed"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Looking for Funding</FormLabel>
                <FormDescription>
                  Enable this to be matched with investors
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchFundingNeeded && (
          <>
            <FormField
              control={form.control}
              name="funding_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Amount Needed</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select funding range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fundingRanges.map(range => (
                        <SelectItem key={range} value={range}>{range}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_support"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Support Types</FormLabel>
                  <FormControl>
                    <TagMultiSelect
                      options={supportTypes}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select support types"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="sectors_of_interest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sectors of Interest</FormLabel>
              <FormControl>
                <TagMultiSelect
                  options={investorSectors}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select sectors you're interested in"
                />
              </FormControl>
              <FormDescription>For networking and matching purposes</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}
