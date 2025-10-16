import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CountrySelect } from '@/components/CountrySelect';
import { AddressInput } from '@/components/AddressInput';
import { QualificationsInput } from '@/components/QualificationsInput';
import { ImageUpload } from '@/components/ImageUpload';
import { ArrowLeft } from 'lucide-react';
import { sectors, countries } from '../data/countries';

interface ProfileFormProps {
  accountType: string;
  onSubmit: (data: any) => void;
  onPrevious: () => void;
  loading: boolean;
  initialData?: any;
}

export const ProfileForm = ({ accountType, onSubmit, onPrevious, loading, initialData }: ProfileFormProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    payment_method: initialData?.payment_method || 'phone',
    use_same_phone: initialData?.use_same_phone ?? true,
    qualifications: [],
    gaps_identified: [],
    phone: '',
    payment_phone: '',
    card_number: '',
    card_expiry: '',
    cardholder_name: initialData?.card_details?.cardholder_name || '',
    profile_image_url: null,
    linkedin_url: '',
    ...initialData
  });

  const savedCardLast4 = initialData?.card_details?.last4;
  const savedCardExpiry =
    initialData?.card_details?.expiry_month && initialData?.card_details?.expiry_year
      ? `${String(initialData.card_details.expiry_month).padStart(2, '0')}/${String(initialData.card_details.expiry_year).slice(-2)}`
      : undefined;
  const savedCardholderName = initialData?.card_details?.cardholder_name;

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setFormData((prev) => {
      const shouldUseCard = initialData.payment_method === 'card';

      return {
        ...prev,
        ...initialData,
        payment_method: initialData.payment_method || prev.payment_method,
        use_same_phone: shouldUseCard ? false : initialData.use_same_phone ?? prev.use_same_phone,
        payment_phone: initialData.payment_phone ?? prev.payment_phone,
        cardholder_name: initialData.card_details?.cardholder_name ?? prev.cardholder_name,
        card_number: shouldUseCard ? '' : prev.card_number,
        card_expiry: shouldUseCard ? '' : prev.card_expiry,
      };
    });
  }, [initialData]);

  // Auto-populate country code when country changes
  useEffect(() => {
    if (!formData.country) {
      return;
    }
    const selectedCountry = countries.find(c => c.name === formData.country);
    if (!selectedCountry) {
      return;
    }

    const phoneCode = selectedCountry.phoneCode;

    setFormData(prev => {
      let nextState = prev;

      if (prev.phone && !prev.phone.startsWith('+')) {
        const updatedPhone = `${phoneCode} ${prev.phone.replace(/^\+?\d{1,4}\s?/, '')}`;
        if (updatedPhone !== prev.phone) {
          nextState = { ...nextState, phone: updatedPhone };
        }
      } else if (!prev.phone) {
        const defaultPhone = `${phoneCode} `;
        if (prev.phone !== defaultPhone) {
          nextState = { ...nextState, phone: defaultPhone };
        }
      }

      if (!prev.use_same_phone) {
        if (prev.payment_phone && !prev.payment_phone.startsWith('+')) {
          const updatedPaymentPhone = `${phoneCode} ${prev.payment_phone.replace(/^\+?\d{1,4}\s?/, '')}`;
          if (updatedPaymentPhone !== prev.payment_phone) {
            nextState = { ...nextState, payment_phone: updatedPaymentPhone };
          }
        } else if (!prev.payment_phone) {
          const defaultPaymentPhone = `${phoneCode} `;
          if (prev.payment_phone !== defaultPaymentPhone) {
            nextState = { ...nextState, payment_phone: defaultPaymentPhone };
          }
        }
      }

      return nextState;
    });
  }, [formData.country]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUseSamePhoneChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    setFormData((prev: any) => ({
      ...prev,
      use_same_phone: isChecked,
      payment_method: isChecked ? 'phone' : prev.payment_method,
      payment_phone: isChecked ? '' : prev.payment_phone,
      card_number: isChecked ? '' : prev.card_number,
      card_expiry: isChecked ? '' : prev.card_expiry,
      cardholder_name: isChecked ? '' : prev.cardholder_name,
    }));
  };

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    handleInputChange('card_number', formatted);
  };

  const handleCardExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    handleInputChange('card_expiry', formatted);
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev: any) => ({ 
      ...prev, 
      address,
      coordinates: coordinates || null
    }));
  };

  const renderSoleProprietorFields = () => (
    <>
      <ImageUpload
        currentImage={formData.profile_image_url}
        onImageChange={(url) => handleInputChange('profile_image_url', url)}
        label="Business Logo"
        type="logo"
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Business Name</Label>
          <Input 
            value={formData.business_name || ''}
            onChange={(e) => handleInputChange('business_name', e.target.value)} 
          />
        </div>
        <div>
          <Label>Registration Number</Label>
          <Input 
            value={formData.registration_number || ''}
            onChange={(e) => handleInputChange('registration_number', e.target.value)} 
          />
        </div>
      </div>
      <div>
        <Label>LinkedIn Profile URL</Label>
        <Input 
          value={formData.linkedin_url || ''}
          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/your-profile"
        />
      </div>
    </>
  );

  const renderProfessionalFields = () => (
    <>
      <ImageUpload
        currentImage={formData.profile_image_url}
        onImageChange={(url) => handleInputChange('profile_image_url', url)}
        label="Profile Picture"
        type="profile"
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Years of Experience</Label>
          <Input 
            type="number" 
            value={formData.experience_years || ''}
            onChange={(e) => handleInputChange('experience_years', e.target.value)} 
          />
        </div>
        <div>
          <Label>Professional License Number</Label>
          <Input 
            value={formData.license_number || ''}
            onChange={(e) => handleInputChange('license_number', e.target.value)} 
          />
        </div>
      </div>
      
      <div>
        <Label>LinkedIn Profile URL</Label>
        <Input 
          value={formData.linkedin_url || ''}
          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/your-profile"
        />
      </div>
      
      <QualificationsInput
        qualifications={formData.qualifications}
        onChange={(qualifications) => handleInputChange('qualifications', qualifications)}
      />
    </>
  );

  const renderSMEFields = () => (
    <>
      <ImageUpload
        currentImage={formData.profile_image_url}
        onImageChange={(url) => handleInputChange('profile_image_url', url)}
        label="Company Logo"
        type="logo"
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ownership Structure</Label>
          <Select 
            value={formData.ownership_structure || ''}
            onValueChange={(value) => handleInputChange('ownership_structure', value)}
          >
            <SelectTrigger><SelectValue placeholder="Select ownership structure" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="limited_company">Limited Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Number of Employees</Label>
          <Input 
            type="number" 
            value={formData.employees_count || ''}
            onChange={(e) => handleInputChange('employees_count', e.target.value)} 
          />
        </div>
      </div>
      <div>
        <Label>LinkedIn Profile URL</Label>
        <Input 
          value={formData.linkedin_url || ''}
          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/company/your-company"
        />
      </div>
    </>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div>
            <CardTitle>Complete Your {accountType} Profile</CardTitle>
            <CardDescription>
              Please provide information specific to your account type
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
          {/* Location Fields */}
          <CountrySelect
            onCountryChange={(country) => handleInputChange('country', country)}
            onProvinceChange={(province) => handleInputChange('province', province)}
            selectedCountry={formData.country}
            selectedProvince={formData.province}
          />
          
          <AddressInput
            onAddressChange={handleAddressChange}
            value={formData.address}
          />

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)} 
                placeholder="Country code will be auto-filled"
              />
            </div>
            <div>
              <Label>Sector/Industry</Label>
              <Select 
                value={formData.sectors?.[0] || ''}
                onValueChange={(value) => handleInputChange('sectors', [value])}
              >
                <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                <SelectContent>
                  {sectors.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          {/* Bio Section */}
          <div>
            <Label>Bio</Label>
            <Textarea 
              value={formData.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell others about yourself and what you do..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              This will be shown to anyone who views your profile
            </p>
          </div>
          </div>

          {/* Account Type Specific Fields */}
          {accountType === 'sole_proprietor' && renderSoleProprietorFields()}
          {accountType === 'professional' && renderProfessionalFields()}
          {accountType === 'sme' && renderSMEFields()}

          {/* Payment Method Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
            
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="same-phone"
                checked={formData.use_same_phone}
                onCheckedChange={(checked) => handleUseSamePhoneChange(checked)}
              />
              <Label htmlFor="same-phone">Use the same phone number for subscription payments</Label>
            </div>

            {!formData.use_same_phone && (
              <div className="space-y-4">
                <RadioGroup 
                  value={formData.payment_method} 
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone">Mobile Money</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Credit/Debit Card</Label>
                  </div>
                </RadioGroup>

                {formData.payment_method === 'phone' && (
                  <div>
                    <Label>Payment Phone Number</Label>
                    <Input
                      value={formData.payment_phone}
                      onChange={(e) => handleInputChange('payment_phone', e.target.value)}
                      placeholder="Country code will be auto-filled"
                    />
                  </div>
                )}
                {formData.payment_method === 'card' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Cardholder Name</Label>
                        <Input
                          value={formData.cardholder_name}
                          onChange={(e) => handleInputChange('cardholder_name', e.target.value)}
                          autoComplete="cc-name"
                          placeholder={savedCardholderName || 'Jane Doe'}
                        />
                      </div>
                      <div>
                        <Label>Card Number</Label>
                        <Input
                          value={formData.card_number}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder={savedCardLast4 ? `Card ending in ${savedCardLast4}` : '1234 5678 9012 3456'}
                        />
                      </div>
                      <div>
                        <Label>Expiry (MM/YY)</Label>
                        <Input
                          value={formData.card_expiry}
                          onChange={(e) => handleCardExpiryChange(e.target.value)}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder={savedCardExpiry ? `Expires ${savedCardExpiry}` : '08/27'}
                          maxLength={5}
                        />
                      </div>
                    </div>
                    {savedCardLast4 && (
                      <p className="text-sm text-muted-foreground">
                        Leave these fields blank to keep the saved card ending in {savedCardLast4}
                        {savedCardExpiry ? ` (expires ${savedCardExpiry})` : ''}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Complete Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};