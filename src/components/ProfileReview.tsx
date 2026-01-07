import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, MapPin, Phone, Mail, Building, Calendar, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ProfileReview = () => {
  const [profileData, setProfileData] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (profile && !profile.is_profile_complete) {
      navigate('/profile-setup');
      return;
    }

    fetchProfile();
  }, [user, profile, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      // Fetch profile data
      const { data: fetchedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfileData(fetchedProfile);

      // Fetch payment details from separate table
      const { data: paymentData } = await supabase
        .from('payment_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setPaymentDetails(paymentData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigate('/profile-setup');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Profile not found.</p>
            <Button onClick={() => navigate('/profile-setup')}>
              Create Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'sole_proprietor': 'Sole Proprietor',
      'professional': 'Professional',
      'sme': 'SME',
      'investor': 'Investor',
      'donor': 'Donor',
      'government': 'Government Institution'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.profile_image_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {profileData.business_name ? 
                      profileData.business_name.substring(0, 2).toUpperCase() :
                      (profileData.email || 'U').substring(0, 2).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">
                    {profileData.business_name || profileData.full_name || profileData.email}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {getAccountTypeLabel(profileData.account_type)}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleEditProfile} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span>{profileData.email}</span>
            </div>
            {profileData.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{profileData.phone}</span>
              </div>
            )}
            {profileData.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{profileData.address}</span>
              </div>
            )}
            {profileData.country && (
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <span>{profileData.country}{profileData.province && `, ${profileData.province}`}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business/Professional Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {profileData.account_type === 'professional' ? 'Professional Details' : 'Business Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileData.sectors && profileData.sectors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sector/Industry</h4>
                <div className="flex flex-wrap gap-2">
                  {profileData.sectors.map((sector: string, index: number) => (
                    <Badge key={index} variant="outline">{sector}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profileData.account_type === 'sole_proprietor' && (
              <>
                {profileData.registration_number && (
                  <div>
                    <h4 className="font-medium">Registration Number</h4>
                    <p className="text-muted-foreground">{profileData.registration_number}</p>
                  </div>
                )}
              </>
            )}

            {profileData.account_type === 'professional' && (
              <>
                {profileData.experience_years && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>{profileData.experience_years} years of experience</span>
                  </div>
                )}
                {profileData.license_number && (
                  <div>
                    <h4 className="font-medium">License Number</h4>
                    <p className="text-muted-foreground">{profileData.license_number}</p>
                  </div>
                )}
                {profileData.qualifications && Array.isArray(profileData.qualifications) && (
                  <div>
                    <h4 className="font-medium mb-2">Qualifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileData.qualifications.map((qual: any, index: number) => (
                        <Badge key={index} variant="outline">{typeof qual === 'string' ? qual : qual.name || qual.title}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {profileData.account_type === 'sme' && (
              <>
                {profileData.ownership_structure && (
                  <div>
                    <h4 className="font-medium">Ownership Structure</h4>
                    <p className="text-muted-foreground">{profileData.ownership_structure}</p>
                  </div>
                )}
                {profileData.employee_count && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>{profileData.employee_count} employees</span>
                  </div>
                )}
                {profileData.funding_needed && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>Funding requirement: ${profileData.funding_needed}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentDetails ? (
              <>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>
                    Payment Method: {paymentDetails.payment_method === 'phone' ? 'Mobile Money' : 'Card'}
                  </span>
                </div>
                {paymentDetails.payment_phone && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-muted-foreground">Payment Phone:</span>
                    <span>{paymentDetails.payment_phone}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No payment information configured</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/subscription-plans')}>
            View Subscription Plans
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
