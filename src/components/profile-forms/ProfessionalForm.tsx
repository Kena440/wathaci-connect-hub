import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FormSection } from './FormSection';
import { BaseFormFields } from './BaseFormFields';
import { sectors } from '@/data/countries';
import { Plus, X } from 'lucide-react';

interface ProfessionalFormProps {
  form: UseFormReturn<any>;
}

export const ProfessionalForm = ({ form }: ProfessionalFormProps) => {
  const { register, setValue, watch, formState: { errors } } = form;
  const qualifications = watch('qualifications') || [];

  const addQualification = () => {
    setValue('qualifications', [
      ...qualifications,
      { name: '', institution: '', year: new Date().getFullYear() }
    ]);
  };

  const removeQualification = (index: number) => {
    setValue('qualifications', qualifications.filter((_: any, i: number) => i !== index));
  };

  const updateQualification = (index: number, field: string, value: any) => {
    const updated = [...qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setValue('qualifications', updated);
  };

  return (
    <>
      <BaseFormFields form={form} imageLabel="Professional Photo" imageType="profile" />

      <FormSection 
        title="Professional Details" 
        description="Your expertise and experience"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialization">Area of Specialization *</Label>
            <Select
              value={watch('specialization') || ''}
              onValueChange={(value) => setValue('specialization', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your specialization" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialization && (
              <p className="text-sm text-destructive">{errors.specialization.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience_years">Years of Experience *</Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              max="100"
              {...register('experience_years')}
              placeholder="Years of professional experience"
            />
            {errors.experience_years && (
              <p className="text-sm text-destructive">{errors.experience_years.message as string}</p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection 
        title="Qualifications & Certifications" 
        description="Add your educational background and certifications"
      >
        <div className="space-y-4">
          {qualifications.map((qual: any, index: number) => (
            <div key={index} className="p-4 border rounded-lg space-y-3 relative bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeQualification(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Qualification/Certification</Label>
                  <Input
                    value={qual.name || ''}
                    onChange={(e) => updateQualification(index, 'name', e.target.value)}
                    placeholder="e.g., MBA, CPA, PMP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={qual.institution || ''}
                    onChange={(e) => updateQualification(index, 'institution', e.target.value)}
                    placeholder="Awarding institution"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year Obtained</Label>
                  <Input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={qual.year || ''}
                    onChange={(e) => updateQualification(index, 'year', parseInt(e.target.value))}
                    placeholder="Year"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addQualification}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Qualification
          </Button>
        </div>
      </FormSection>
    </>
  );
};
