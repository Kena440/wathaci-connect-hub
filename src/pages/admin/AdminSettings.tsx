import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  ArrowLeft,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const AdminSettings = () => {
  const settingsSections = [
    {
      title: 'Platform Settings',
      icon: Globe,
      settings: [
        { id: 'maintenance', label: 'Maintenance Mode', description: 'Put the platform in maintenance mode', enabled: false },
        { id: 'registration', label: 'User Registration', description: 'Allow new users to register', enabled: true },
        { id: 'verification', label: 'Email Verification', description: 'Require email verification for new accounts', enabled: true },
      ]
    },
    {
      title: 'Security Settings',
      icon: Shield,
      settings: [
        { id: '2fa', label: 'Two-Factor Authentication', description: 'Require 2FA for admin accounts', enabled: false },
        { id: 'session', label: 'Session Timeout', description: 'Auto logout after 30 minutes of inactivity', enabled: true },
        { id: 'ipblock', label: 'IP Blocking', description: 'Block suspicious IP addresses automatically', enabled: true },
      ]
    },
    {
      title: 'Notification Settings',
      icon: Bell,
      settings: [
        { id: 'email_notifications', label: 'Email Notifications', description: 'Send email notifications for important events', enabled: true },
        { id: 'admin_alerts', label: 'Admin Alerts', description: 'Receive alerts for critical system events', enabled: true },
        { id: 'user_reports', label: 'User Reports', description: 'Get notified when users report issues', enabled: true },
      ]
    },
  ];

  return (
    <>
      <Helmet>
        <title>Settings | Admin | Wathaci Connect</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Platform Settings</h1>
                  <p className="text-muted-foreground">Configure system-wide settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {settingsSections.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <section.icon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>Manage {section.title.toLowerCase()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.settings.map((setting, index) => (
                    <div key={setting.id}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={setting.id} className="text-base font-medium">
                            {setting.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <Switch id={setting.id} defaultChecked={setting.enabled} />
                      </div>
                      {index < section.settings.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Button variant="outline" className="justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                <Button variant="outline" className="justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
                <Button variant="outline" className="justify-start">
                  <Palette className="h-4 w-4 mr-2" />
                  Reset Theme
                </Button>
                <Button variant="outline" className="justify-start text-destructive hover:text-destructive">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Audit
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSettings;
