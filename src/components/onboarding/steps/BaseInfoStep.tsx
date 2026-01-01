import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from '../FormSection';
import { AvatarUploadWithCrop } from '../AvatarUploadWithCrop';
import { BaseProfileData } from '@/lib/validations/onboarding';

interface BaseInfoStepProps {
  form: UseFormReturn<BaseProfileData>;
  onAvatarChange?: (url: string | null) => void;
  currentAvatar?: string | null;
}

export function BaseInfoStep({ form, onAvatarChange, currentAvatar }: BaseInfoStepProps) {
  const fullName = form.watch('full_name');
  
  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <FormSection 
        title="Profile Photo" 
        description="Add a photo to personalize your profile"
      >
        <div className="flex justify-center py-2">
          <AvatarUploadWithCrop
            currentImage={currentAvatar}
            onImageChange={onAvatarChange || (() => {})}
            userName={fullName}
            size="xl"
          />
        </div>
      </FormSection>

      <FormSection 
        title="Personal Information" 
        description="Tell us about yourself"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Mwansa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="How you want to be called" 
                    {...field} 
                    value={field.value || ''} 
                  />
                </FormControl>
                <FormDescription>Optional nickname or business name</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="+260971234567" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormDescription>Zambian mobile number</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Location" 
        description="Where are you based?"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'Zambia'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Zambia">Zambia</SelectItem>
                    <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                    <SelectItem value="Botswana">Botswana</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Malawi">Malawi</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Lusaka" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection 
        title="About You" 
        description="A brief introduction for your profile"
      >
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us about yourself and what you do..." 
                  className="min-h-[100px] resize-none"
                  maxLength={280}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/280 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection 
        title="Online Presence" 
        description="Optional links to your website and social profiles"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="website_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://yourwebsite.com" 
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
            name="linkedin_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://linkedin.com/in/yourprofile" 
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
    </div>
  );
}
