import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, User, Building, Briefcase, TrendingUp, Heart, Landmark } from 'lucide-react';
import {
  soleProprietorSchema,
  professionalSchema,
  smeSchema,
  investorSchema,
  donorSchema,
  governmentSchema,
} from './types';
import { SoleProprietorForm } from './SoleProprietorForm';
import { ProfessionalForm } from './ProfessionalForm';
import { SMEForm } from './SMEForm';
import { InvestorForm } from './InvestorForm';
import { DonorForm } from './DonorForm';
import { GovernmentForm } from './GovernmentForm';
import { PaymentFields } from './PaymentFields';

interface EnhancedProfileFormProps {
  accountType: string;
  onSubmit: (data: any) => Promise<void>;
  onPrevious: () => void;
  loading: boolean;
  initialData?: any;
}

const accountTypeConfig: Record<string, {
  schema: any;
  component: React.ComponentType<{ form: any }>;
  title: string;
  description: string;
  icon: React.ElementType;
}> = {
  sole_proprietor: {
    schema: soleProprietorSchema,
    component: SoleProprietorForm,
    title: 'Sole Proprietor',
    description: 'Individual business owner profile',
    icon: User,
  },
  professional: {
    schema: professionalSchema,
    component: ProfessionalForm,
    title: 'Professional',
    description: 'Expert service provider profile',
    icon: Briefcase,
  },
  sme: {
    schema: smeSchema,
    component: SMEForm,
    title: 'SME',
    description: 'Small & Medium Enterprise profile',
    icon: Building,
  },
  investor: {
    schema: investorSchema,
    component: InvestorForm,
    title: 'Investor',
    description: 'Investment professional profile',
    icon: TrendingUp,
  },
  donor: {
    schema: donorSchema,
    component: DonorForm,
    title: 'Donor',
    description: 'Philanthropic organization profile',
    icon: Heart,
  },
  government: {
    schema: governmentSchema,
    component: GovernmentForm,
    title: 'Government Institution',
    description: 'Government agency profile',
    icon: Landmark,
  },
};

export const EnhancedProfileForm = ({
  accountType,
  onSubmit,
  onPrevious,
  loading,
  initialData,
}: EnhancedProfileFormProps) => {
  const config = accountTypeConfig[accountType];
  
  const form = useForm({
    resolver: config ? zodResolver(config.schema) : undefined,
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      country: '',
      address: '',
      description: '',
      industry_sector: '',
      linkedin_url: '',
      website_url: '',
      profile_image_url: '',
      business_name: '',
      registration_number: '',
      specialization: '',
      experience_years: undefined,
      employee_count: undefined,
      annual_revenue: undefined,
      funding_stage: '',
      qualifications: [],
      use_same_phone: true,
      payment_method: 'phone',
      payment_phone: '',
      ...initialData,
    },
  });

  if (!config) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Unknown account type. Please go back and select a valid account type.
          </p>
          <Button onClick={onPrevious} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const FormComponent = config.component;
  const Icon = config.icon;

  const handleFormSubmit = form.handleSubmit(async (data) => {
    // Process payment data
    let paymentData: Record<string, any> = {};
    if (data.use_same_phone) {
      paymentData = {
        payment_phone: data.phone,
        payment_method: 'phone',
      };
    } else {
      paymentData = {
        payment_method: data.payment_method,
        payment_phone: data.payment_method === 'phone' ? data.payment_phone : null,
      };
    }

    // Merge full_name from first_name and last_name
    const fullName = `${data.first_name} ${data.last_name}`.trim();

    // Prepare the final data object
    const profileData = {
      ...data,
      ...paymentData,
      full_name: fullName,
      account_type: accountType,
    };

    await onSubmit(profileData);
  });

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{config.title} Profile</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <FormComponent form={form} />
          <PaymentFields form={form} />
          
          <div className="pt-4 border-t">
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              You can update your profile information at any time
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
