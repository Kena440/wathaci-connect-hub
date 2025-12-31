import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelect } from '@/components/CountrySelect';
import { AddressInput } from '@/components/AddressInput';
import { ImageUpload } from '@/components/ImageUpload';
import { FormSection } from './FormSection';
import { sectors } from '@/data/countries';

interface BaseFormFieldsProps {
  form: UseFormReturn<any>;
  imageLabel?: string;
  imageType?: 'profile' | 'logo';
}

export const BaseFormFields = ({ form, imageLabel = 'Profile Picture', imageType = 'profile' }: BaseFormFieldsProps) => {
  const { register, setValue, watch, formState: { errors } } = form;
  
  return (
    <>
      <FormSection title="Profile Image" description="Upload a professional image">
        <ImageUpload
          currentImage={watch('profile_image_url')}
          onImageChange={(url) => setValue('profile_image_url', url)}
          label={imageLabel}
          type={imageType}
        />
      </FormSection>

      <FormSection title="Personal Information" description="Your basic contact details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              {...register('first_name')}
              placeholder="Enter your first name"
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              {...register('last_name')}
              placeholder="Enter your last name"
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message as string}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+260 XXX XXX XXX"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message as string}</p>
          )}
        </div>
      </FormSection>

      <FormSection title="Location" description="Where you are based">
        <CountrySelect
          onCountryChange={(country) => setValue('country', country)}
          onProvinceChange={(province) => setValue('province', province)}
          selectedCountry={watch('country')}
          selectedProvince={watch('province')}
        />
        {errors.country && (
          <p className="text-sm text-destructive">{errors.country.message as string}</p>
        )}
        
        <AddressInput
          onAddressChange={(address, coordinates) => {
            setValue('address', address);
            if (coordinates) {
              setValue('coordinates', coordinates);
            }
          }}
          value={watch('address')}
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message as string}</p>
        )}
      </FormSection>

      <FormSection title="Industry & Bio" description="Tell us about your work">
        <div className="space-y-2">
          <Label htmlFor="industry_sector">Industry/Sector</Label>
          <Select
            value={watch('industry_sector') || ''}
            onValueChange={(value) => setValue('industry_sector', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map(sector => (
                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Bio / Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Tell others about yourself, your work, and what you're looking for..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">Maximum 500 characters</p>
        </div>
      </FormSection>

      <FormSection title="Online Presence" description="Your web and social links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              {...register('linkedin_url')}
              placeholder="https://linkedin.com/in/yourprofile"
            />
            {errors.linkedin_url && (
              <p className="text-sm text-destructive">{errors.linkedin_url.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              {...register('website_url')}
              placeholder="https://yourwebsite.com"
            />
            {errors.website_url && (
              <p className="text-sm text-destructive">{errors.website_url.message as string}</p>
            )}
          </div>
        </div>
      </FormSection>
    </>
  );
};
