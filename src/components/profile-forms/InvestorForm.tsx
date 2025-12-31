import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';
import { fundingStages, investmentFocus } from './types';

interface InvestorFormProps {
  form: UseFormReturn<any>;
}

export const InvestorForm = ({ form }: InvestorFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;

  return (
    <>
      <BaseFormFields form={form} imageLabel="Profile Photo" imageType="profile" />

      <FormSection 
        title="Investment Details" 
        description="Your investment preferences and capacity"
      >
        <div className="space-y-2">
          <Label htmlFor="business_name">Investment Firm / Organization (Optional)</Label>
          <Input
            id="business_name"
            {...register('business_name')}
            placeholder="If investing through a firm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialization">Primary Investment Focus *</Label>
            <Select
              value={watch('specialization') || ''}
              onValueChange={(value) => setValue('specialization', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your focus area" />
              </SelectTrigger>
              <SelectContent>
                {investmentFocus.map(focus => (
                  <SelectItem key={focus} value={focus}>{focus}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialization && (
              <p className="text-sm text-destructive">{errors.specialization.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="funding_stage">Preferred Funding Stage *</Label>
            <Select
              value={watch('funding_stage') || ''}
              onValueChange={(value) => setValue('funding_stage', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preferred stage" />
              </SelectTrigger>
              <SelectContent>
                {fundingStages.map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.funding_stage && (
              <p className="text-sm text-destructive">{errors.funding_stage.message as string}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="annual_revenue">Investment Capacity (USD) *</Label>
          <Input
            id="annual_revenue"
            type="number"
            min="0"
            {...register('annual_revenue')}
            placeholder="Amount you typically invest"
          />
          {errors.annual_revenue && (
            <p className="text-sm text-destructive">{errors.annual_revenue.message as string}</p>
          )}
          <p className="text-xs text-muted-foreground">This helps match you with appropriate investment opportunities</p>
        </div>
      </FormSection>
    </>
  );
};
