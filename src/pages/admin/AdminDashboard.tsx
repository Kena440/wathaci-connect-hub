import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  FileText, 
  Settings, 
  Bell, 
  LayoutDashboard,
  ChevronRight,
  Activity,
  TrendingUp,
  UserCheck,
  Landmark,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const location = useLocation();

  // Fetch dashboard stats (totals + month-over-month change)
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();

      const countAll = (table: 'profiles' | 'sme_profiles' | 'freelancer_profiles' | 'investor_profiles' | 'government_profiles') =>
        supabase.from(table).select('created_at', { count: 'exact', head: true });
      const countThisMonth = (table: 'profiles' | 'sme_profiles' | 'freelancer_profiles' | 'investor_profiles' | 'government_profiles') =>
        supabase.from(table).select('created_at', { count: 'exact', head: true }).gte('created_at', startOfThisMonth);
      const countLastMonth = (table: 'profiles' | 'sme_profiles' | 'freelancer_profiles' | 'investor_profiles' | 'government_profiles') =>
        supabase
          .from(table)
          .select('created_at', { count: 'exact', head: true })
          .gte('created_at', startOfLastMonth)
          .lt('created_at', startOfThisMonth);

      const tables = ['profiles', 'sme_profiles', 'freelancer_profiles', 'investor_profiles', 'government_profiles'] as const;

      const results = await Promise.all(
        tables.flatMap((t) => [countAll(t), countThisMonth(t), countLastMonth(t)])
      );

      const pick = (i: number) => ({
        total: results[i * 3].count || 0,
        thisMonth: results[i * 3 + 1].count || 0,
        lastMonth: results[i * 3 + 2].count || 0,
      });

      return {
        users: pick(0),
        sme: pick(1),
        freelancer: pick(2),
        investor: pick(3),
        government: pick(4),
      };
    }
  });

  const trendFor = (entry?: { thisMonth: number; lastMonth: number }) => {
    if (!entry) return null;
    if (entry.lastMonth === 0) {
      return entry.thisMonth > 0 ? `+${entry.thisMonth} new` : null;
    }
    const pct = Math.round(((entry.thisMonth - entry.lastMonth) / entry.lastMonth) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  };

  const adminLinks = [
    {
      title: 'User Management',
      description: 'View, edit, and manage all platform users',
      icon: Users,
      href: '/admin/users',
      badge: stats?.users.total,
    },
    {
      title: 'Role Management',
      description: 'Assign and revoke admin roles',
      icon: Shield,
      href: '/admin/roles',
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and changes',
      icon: FileText,
      href: '/admin/audit-logs',
    },
    {
      title: 'Notifications',
      description: 'Send system-wide announcements',
      icon: Bell,
      href: '/admin/notifications',
    },
    {
      title: 'Settings',
      description: 'Configure platform settings',
      icon: Settings,
      href: '/admin/settings',
    },
  ];

  const quickStats = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      icon: Users,
      trend: trendFor(stats?.users),
      color: 'text-primary',
    },
    {
      title: 'SMEs',
      value: stats?.sme.total || 0,
      icon: Activity,
      trend: trendFor(stats?.sme),
      color: 'text-zambia-green',
    },
    {
      title: 'Freelancers',
      value: stats?.freelancer.total || 0,
      icon: UserCheck,
      trend: trendFor(stats?.freelancer),
      color: 'text-zambia-orange',
    },
    {
      title: 'Investors',
      value: stats?.investor.total || 0,
      icon: TrendingUp,
      trend: trendFor(stats?.investor),
      color: 'text-blue-500',
    },
    {
      title: 'Government',
      value: stats?.government.total || 0,
      icon: Landmark,
      trend: trendFor(stats?.government),
      color: 'text-muted-foreground',
    },
  ];


  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Wathaci Connect</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage your platform</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
            {quickStats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  {stat.trend && (
                    <div className="mt-3 flex items-center text-sm">
                      <Badge variant="secondary" className="text-xs">
                        {stat.trend}
                      </Badge>
                      <span className="ml-2 text-muted-foreground">from last month</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Admin Sections */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <link.icon className="h-5 w-5 text-primary" />
                      </div>
                      {link.badge !== undefined && (
                        <Badge variant="secondary">{link.badge}</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4 flex items-center justify-between">
                      {link.title}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {/* Recent Activity Preview */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions on the platform</CardDescription>
                </div>
                <Link to="/admin/audit-logs">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-5 w-5 mr-2" />
                Activity logs will appear here
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
