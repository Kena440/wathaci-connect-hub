import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ComplianceTracker from '@/components/tools/ComplianceTracker';
import BusinessRegistration from '@/components/tools/BusinessRegistration';
import { Building, FileCheck, TrendingUp, Users } from 'lucide-react';

const SoleProprietorDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Business Dashboard</h1>
        <Button>
          <Building className="w-4 h-4 mr-2" />
          Quick Actions
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Business Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-gray-500">PACRA Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <p className="text-xs text-gray-500">Good standing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW 45,200</div>
            <p className="text-xs text-green-600">+12% vs last year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-blue-600">+8 this month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compliance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <ComplianceTracker />
        </TabsContent>

        <TabsContent value="registration">
          <BusinessRegistration />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Monthly Revenue Growth</span>
                    <span className="text-green-600 font-medium">+15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Customer Retention Rate</span>
                    <span className="text-blue-600 font-medium">92%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Order Value</span>
                    <span className="font-medium">ZMW 356</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Business Support Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Tax Filing Assistance</h4>
                  <p className="text-sm text-gray-600 mb-3">Get help with ZRA tax returns and VAT registration</p>
                  <Button size="sm">Get Help</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Business Mentorship</h4>
                  <p className="text-sm text-gray-600 mb-3">Connect with experienced business mentors</p>
                  <Button size="sm">Find Mentor</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Funding Opportunities</h4>
                  <p className="text-sm text-gray-600 mb-3">Explore grants and loans for small businesses</p>
                  <Button size="sm">View Options</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SoleProprietorDashboard;