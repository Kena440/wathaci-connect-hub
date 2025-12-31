import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';
import { fundingStages } from './types';

interface SMEFormProps {
  form: UseFormReturn<any>;
}

export const SMEForm = ({ form }: SMEFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;

  return (
    <>
      <BaseFormFields form={form} imageLabel="Company Logo" imageType="logo" />

      <FormSection 
        title="Company Information" 
        description="Details about your small/medium enterprise"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Company Name *</Label>
            <Input
              id="business_name"
              {...register('business_name')}
              placeholder="Your company name"
            />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">Company Registration Number *</Label>
            <Input
              id="registration_number"
              {...register('registration_number')}
              placeholder="e.g., PACRA/SEC number"
            />
            {errors.registration_number && (
              <p className="text-sm text-destructive">{errors.registration_number.message as string}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employee_count">Number of Employees *</Label>
            <Input
              id="employee_count"
              type="number"
              min="1"
              {...register('employee_count')}
              placeholder="Total number of employees"
            />
            {errors.employee_count && (
              <p className="text-sm text-destructive">{errors.employee_count.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="annual_revenue">Annual Revenue (USD)</Label>
            <Input
              id="annual_revenue"
              type="number"
              min="0"
              {...register('annual_revenue')}
              placeholder="Approximate annual revenue"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="funding_stage">Current Funding Stage</Label>
          <Select
            value={watch('funding_stage') || ''}
            onValueChange={(value) => setValue('funding_stage', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your funding stage" />
            </SelectTrigger>
            <SelectContent>
              {fundingStages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">This helps investors find suitable opportunities</p>
        </div>
      </FormSection>
    </>
  );
};
