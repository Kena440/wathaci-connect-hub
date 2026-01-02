import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Search,
  ArrowLeft,
  UserPlus,
  Trash2,
  Loader2,
  Crown,
  UserCog
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const RolesManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('admin');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch admin users with roles
  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          notes
        `)
        .in('role', ['admin', 'moderator'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = roles?.map(r => r.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase.rpc('admin_list_profiles', { p_limit: 200 });
      if (profilesError) throw profilesError;
      const profilesMap = new Map((profiles as any[] | null)?.map(p => [p.id, p]));

      const profilesMap = new Map(profiles?.map(p => [p.id, p]));

      return roles?.map(role => ({
        ...role,
        profile: profilesMap.get(role.user_id)
      }));
    }
  });

  // Fetch all users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-roles', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_profiles', { p_limit: 200 });
      if (error) throw error;
      let rows = (data as any[]) || [];

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        rows = rows.filter(r =>
          [r.full_name, r.email, r.display_name].some((v: any) =>
            typeof v === 'string' && v.toLowerCase().includes(q)
          )
        );
      }

      return rows.slice(0, 20).map(r => ({
        id: r.id,
        full_name: r.full_name,
        display_name: r.display_name,
        email: r.email,
        avatar_url: r.avatar_url,
      }));

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAssignDialogOpen
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { data, error } = await supabase.rpc('assign_admin_role', {
        p_target_user_id: userId,
        p_role: role,
        p_notes: `Assigned via admin dashboard`
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign role');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Role assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setIsAssignDialogOpen(false);
      setSelectedUser('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.rpc('revoke_admin_role', {
        p_target_user_id: userId,
        p_role: role as 'admin' | 'moderator' | 'user'
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke role');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Role revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Helmet>
        <title>Role Management | Admin | Wathaci Connect</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/admin">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Role Management</h1>
                    <p className="text-muted-foreground">Assign and revoke admin privileges</p>
                  </div>
                </div>
              </div>
              
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Admin Role</DialogTitle>
                    <DialogDescription>
                      Grant administrative privileges to a user. This action will be logged.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search User</label>
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {allUsers && allUsers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select User</label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.display_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'moderator')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="moderator">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4 text-blue-500" />
                              Moderator
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => assignRoleMutation.mutate({ userId: selectedUser, role: selectedRole })}
                      disabled={!selectedUser || assignRoleMutation.isPending}
                    >
                      {assignRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Assign Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Admin & Moderator Users</CardTitle>
              <CardDescription>Users with elevated privileges on the platform</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : adminUsers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No admin users yet. Click "Assign Role" to add one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={item.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(item.profile?.full_name || item.profile?.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {item.profile?.full_name || item.profile?.display_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-muted-foreground">{item.profile?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.role === 'admin' ? 'destructive' : 'default'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {item.role === 'admin' ? (
                              <Crown className="h-3 w-3" />
                            ) : (
                              <UserCog className="h-3 w-3" />
                            )}
                            {item.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {item.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => revokeRoleMutation.mutate({ userId: item.user_id, role: item.role })}
                            disabled={revokeRoleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

export default RolesManager;
