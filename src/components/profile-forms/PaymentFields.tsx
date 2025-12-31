import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormSection } from './FormSection';
import { PhoneInputWithVerification } from '@/components/PhoneInputWithVerification';

interface PaymentFieldsProps {
  form: UseFormReturn<any>;
}

export const PaymentFields = ({ form }: PaymentFieldsProps) => {
  const { setValue, watch } = form;
  const useSamePhone = watch('use_same_phone');
  const paymentMethod = watch('payment_method');
  const paymentPhone = watch('payment_phone') || '';

  return (
    <FormSection 
      title="Payment Information" 
      description="How you'll pay for subscription and services"
    >
      <div className="flex items-center space-x-2">
        <Checkbox
          id="use_same_phone"
          checked={useSamePhone}
          onCheckedChange={(checked) => setValue('use_same_phone', checked)}
        />
        <Label htmlFor="use_same_phone" className="cursor-pointer">
          Use my phone number for mobile money payments
        </Label>
      </div>

      {!useSamePhone && (
        <div className="space-y-4 pl-6 border-l-2 border-muted ml-3">
          <RadioGroup
            value={paymentMethod || 'phone'}
            onValueChange={(value) => setValue('payment_method', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="payment_phone" />
              <Label htmlFor="payment_phone">Mobile Money</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="payment_card" />
              <Label htmlFor="payment_card">Credit/Debit Card</Label>
            </div>
          </RadioGroup>

          {paymentMethod === 'phone' && (
            <PhoneInputWithVerification
              value={paymentPhone}
              onChange={(value) => setValue('payment_phone', value)}
              label="Payment Phone Number"
              placeholder="097XXXXXXX"
              showVerification={true}
            />
          )}

          {paymentMethod === 'card' && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Card payment details will be collected securely during your first transaction.
              </p>
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
};
