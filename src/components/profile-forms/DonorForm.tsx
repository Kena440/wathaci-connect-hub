import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';
import { donorFocusAreas } from './types';

interface DonorFormProps {
  form: UseFormReturn<any>;
}

export const DonorForm = ({ form }: DonorFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;

  const donorTypes = [
    'Individual Philanthropist',
    'Corporate Foundation',
    'Non-Profit Organization',
    'International NGO',
    'Family Foundation',
    'Community Foundation',
  ];

  return (
    <>
      <BaseFormFields form={form} imageLabel="Organization Logo" imageType="logo" />

      <FormSection 
        title="Donor Information" 
        description="About your organization and giving focus"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Organization Name *</Label>
            <Input
              id="business_name"
              {...register('business_name')}
              placeholder="Your organization name"
            />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="funding_stage">Donor Type</Label>
            <Select
              value={watch('funding_stage') || ''}
              onValueChange={(value) => setValue('funding_stage', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select donor type" />
              </SelectTrigger>
              <SelectContent>
                {donorTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialization">Primary Focus Area *</Label>
          <Select
            value={watch('specialization') || ''}
            onValueChange={(value) => setValue('specialization', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your focus area" />
            </SelectTrigger>
            <SelectContent>
              {donorFocusAreas.map(area => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.specialization && (
            <p className="text-sm text-destructive">{errors.specialization.message as string}</p>
          )}
        </div>
      </FormSection>
    </>
  );
};
