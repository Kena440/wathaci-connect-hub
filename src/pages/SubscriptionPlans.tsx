import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { subscriptionPlans, getPlansForUserType, getUserTypeLabel } from '@/data/subscriptionPlans';
import { UserTypeSubscriptions } from '@/components/UserTypeSubscriptions';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import BackToHomeButton from '@/components/BackToHomeButton';

export const SubscriptionPlans = () => {
  const [selectedUserType, setSelectedUserType] = useState<string>('all');
  const { user } = useAppContext();
  const navigate = useNavigate();

  const userTypes = [
    { id: 'all', label: 'All Plans' },
    { id: 'sole_proprietor', label: 'Sole Proprietor' },
    { id: 'professional', label: 'Professional' },
    { id: 'sme', label: 'SME' },
    { id: 'investor', label: 'Investor' },
    { id: 'donor', label: 'Donor' },
    { id: 'government', label: 'Government' }
  ];

  useEffect(() => {
    if (user?.account_type) {
      setSelectedUserType(user.account_type);
    }
  }, [user]);

  const getDisplayPlans = () => {
    if (selectedUserType === 'all') {
      return subscriptionPlans;
    }
    return getPlansForUserType(selectedUserType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackToHomeButton />
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your business needs and start connecting with opportunities
          </p>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg inline-block">
            <p className="text-blue-800 font-medium">💳 Secure payments powered by Lenco</p>
          </div>
        </div>

        <Tabs value={selectedUserType} onValueChange={setSelectedUserType} className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-7 mb-8">
            {userTypes.map((type) => (
              <TabsTrigger key={type.id} value={type.id} className="text-xs">
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-8">
              {['basic', 'professional', 'enterprise'].map((category) => {
                const categoryPlans = subscriptionPlans.filter(plan => plan.category === category);
                return (
                  <div key={category}>
                    <h2 className="text-2xl font-bold mb-4 capitalize">{category} Plans</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryPlans.map((plan) => (
                        <SubscriptionCard key={plan.id} plan={plan} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {userTypes.slice(1).map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <UserTypeSubscriptions userType={type.id} showTitle={false} />
            </TabsContent>
          ))}
        </Tabs>

        <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Need Help Choosing?</h3>
              <p className="text-gray-600 mb-4">
                Our team can help you find the perfect plan for your specific needs
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline">Contact Sales</Button>
                <Button>Start Free Trial</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};