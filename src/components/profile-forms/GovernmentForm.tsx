import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';

interface GovernmentFormProps {
  form: UseFormReturn<any>;
}

export const GovernmentForm = ({ form }: GovernmentFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;

  const governmentDepartments = [
    'Ministry of Commerce, Trade & Industry',
    'Ministry of Finance',
    'Ministry of Agriculture',
    'Ministry of Tourism',
    'Ministry of Mines & Minerals',
    'Ministry of Technology & Science',
    'Ministry of Small & Medium Enterprise',
    'Ministry of Labour',
    'Ministry of Health',
    'Ministry of Education',
    'Zambia Development Agency (ZDA)',
    'Patents & Companies Registration Agency (PACRA)',
    'Zambia Revenue Authority (ZRA)',
    'Local Government Authority',
    'Other Government Agency',
  ];

  return (
    <>
      <BaseFormFields form={form} imageLabel="Institution Logo" imageType="logo" />

      <FormSection 
        title="Government Institution Details" 
        description="Information about your government organization"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Institution Name *</Label>
            <Input
              id="business_name"
              {...register('business_name')}
              placeholder="Name of your institution"
            />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">Official ID / Employee Number *</Label>
            <Input
              id="registration_number"
              {...register('registration_number')}
              placeholder="Your official identification"
            />
            {errors.registration_number && (
              <p className="text-sm text-destructive">{errors.registration_number.message as string}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialization">Department / Division *</Label>
          <Select
            value={watch('specialization') || ''}
            onValueChange={(value) => setValue('specialization', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your department" />
            </SelectTrigger>
            <SelectContent>
              {governmentDepartments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
