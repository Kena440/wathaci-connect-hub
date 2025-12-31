import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';
import { sectors } from '@/data/countries';

interface SoleProprietorFormProps {
  form: UseFormReturn<any>;
}

export const SoleProprietorForm = ({ form }: SoleProprietorFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;

  return (
    <>
      <BaseFormFields form={form} imageLabel="Business Logo" imageType="logo" />

      <FormSection 
        title="Business Details" 
        description="Information about your sole proprietorship"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              {...register('business_name')}
              placeholder="Your business name"
            />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">Business Registration Number</Label>
            <Input
              id="registration_number"
              {...register('registration_number')}
              placeholder="e.g., PACRA number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialization">Business Specialization</Label>
            <Select
              value={watch('specialization') || ''}
              onValueChange={(value) => setValue('specialization', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="What do you specialize in?" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience_years">Years in Business</Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              max="100"
              {...register('experience_years')}
              placeholder="How many years?"
            />
          </div>
        </div>
      </FormSection>
    </>
  );
};
