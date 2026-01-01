import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  ArrowLeft,
  Eye,
  Edit,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const UsersManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, accountTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          display_name,
          email,
          avatar_url,
          account_type,
          is_profile_complete,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      if (accountTypeFilter && accountTypeFilter !== 'all') {
        query = query.eq('account_type', accountTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch roles for each user
      const userIds = data?.map(u => u.id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map<string, string[]>();
      roles?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role]);
      });

      return data?.map(user => ({
        ...user,
        roles: rolesMap.get(user.id) || ['user']
      }));
    }
  });

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAccountTypeBadge = (type?: string | null) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      sme: { label: 'SME', variant: 'default' },
      freelancer: { label: 'Freelancer', variant: 'secondary' },
      investor: { label: 'Investor', variant: 'outline' },
      government: { label: 'Government', variant: 'secondary' },
    };
    const config = variants[type || ''] || { label: type || 'Unknown', variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Helmet>
        <title>User Management | Admin | Wathaci Connect</title>
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
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">User Management</h1>
                  <p className="text-muted-foreground">View and manage platform users</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sme">SME</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(user.full_name || user.display_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || user.display_name || 'Unnamed User'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getAccountTypeBadge(user.account_type)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role: string) => (
                              <Badge 
                                key={role} 
                                variant={role === 'admin' ? 'destructive' : role === 'moderator' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_profile_complete ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default UsersManager;
