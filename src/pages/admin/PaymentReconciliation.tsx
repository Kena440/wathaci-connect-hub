import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Wrench,
  Search,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

interface Transaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  full_name?: string;
  email?: string;
  lenco_reference: string | null;
  description: string | null;
  profiles?: { full_name: string; email: string } | null;
}

interface PaymentAccount {
  user_id: string;
  balance_zmw: number;
  balance_usd: number;
  pending_balance_zmw: number;
  pending_balance_usd: number;
}

export default function PaymentReconciliation() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [repairAmount, setRepairAmount] = useState<string>('');
  const [repairCurrency, setRepairCurrency] = useState<string>('ZMW');
  const [repairReason, setRepairReason] = useState<string>('');

  // Fetch transactions with anomaly detection
  const { data: transactions, isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['admin-transactions', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'successful' | 'failed');
      }

      if (searchTerm) {
        query = query.or(`lenco_reference.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Transaction[];
    }
  });

  // Fetch payment accounts for balance verification
  const { data: accounts } = useQuery({
    queryKey: ['admin-payment-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*');
      if (error) throw error;
      return data as unknown as PaymentAccount[];
    }
  });

  // Detect anomalies
  const { data: anomalies } = useQuery({
    queryKey: ['payment-anomalies', transactions, accounts],
    queryFn: async () => {
      if (!transactions || !accounts) return [];
      
      const issues: Array<{
        type: string;
        severity: 'warning' | 'error';
        message: string;
        userId?: string;
        transactionId?: string;
      }> = [];

      // Check for stuck pending transactions older than 24 hours
      const oldPending = transactions.filter(t => 
        t.status === 'pending' && 
        new Date(t.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      oldPending.forEach(t => {
        issues.push({
          type: 'stuck_transaction',
          severity: 'warning',
          message: `Transaction ${t.id.slice(0, 8)}... pending for over 24 hours`,
          transactionId: t.id,
          userId: t.user_id
        });
      });

      // Check for negative balances (should never happen)
      accounts.forEach(acc => {
        if (acc.balance_zmw < 0 || acc.balance_usd < 0) {
          issues.push({
            type: 'negative_balance',
            severity: 'error',
            message: `User ${acc.user_id.slice(0, 8)}... has negative balance`,
            userId: acc.user_id
          });
        }
      });

      return issues;
    },
    enabled: !!transactions && !!accounts
  });

  // Admin repair mutation
  const repairMutation = useMutation({
    mutationFn: async ({ userId, amount, currency, reason }: {
      userId: string;
      amount: number;
      currency: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_repair_wallet_transaction', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
        p_reason: reason
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Repair failed');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Wallet adjustment applied successfully');
      setRepairDialogOpen(false);
      setRepairAmount('');
      setRepairReason('');
      setSelectedUserId('');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payment-accounts'] });
    },
    onError: (error: Error) => {
      toast.error(`Repair failed: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'successful':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Successful</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRepair = () => {
    if (!selectedUserId || !repairAmount || !repairReason) {
      toast.error('Please fill all fields');
      return;
    }

    repairMutation.mutate({
      userId: selectedUserId,
      amount: parseFloat(repairAmount),
      currency: repairCurrency,
      reason: repairReason
    });
  };

  const openRepairForUser = (userId: string) => {
    setSelectedUserId(userId);
    setRepairDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Reconciliation</h1>
          <p className="text-muted-foreground">
            Monitor transactions, detect anomalies, and perform administrative repairs
          </p>
        </div>

        {/* Anomaly Alerts */}
        {anomalies && anomalies.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5" />
                Detected Anomalies ({anomalies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {anomalies.map((anomaly, idx) => (
                  <li key={idx} className="flex items-center justify-between p-2 bg-background rounded">
                    <div className="flex items-center gap-2">
                      {anomaly.severity === 'error' ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-sm">{anomaly.message}</span>
                    </div>
                    {anomaly.userId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openRepairForUser(anomaly.userId!)}
                      >
                        <Wrench className="w-3 h-3 mr-1" /> Repair
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by reference or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => refetchTransactions()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>

          <Button onClick={() => setRepairDialogOpen(true)}>
            <Wrench className="w-4 h-4 mr-2" /> Manual Repair
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions?.length || 0}</p>
                </div>
                <ArrowUpDown className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">
                    {transactions?.filter(t => t.status === 'successful').length || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {transactions?.filter(t => t.status === 'pending').length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-destructive">
                    {transactions?.filter(t => t.status === 'failed').length || 0}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>View and manage all platform transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {tx.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.profiles?.email || tx.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {tx.transaction_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {tx.currency} {tx.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {tx.lenco_reference?.slice(0, 12) || '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openRepairForUser(tx.user_id)}
                        >
                          <Wrench className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Repair Dialog */}
        <Dialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Manual Wallet Adjustment
              </DialogTitle>
              <DialogDescription>
                Use this to correct wallet balances. All adjustments are logged to the audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Enter user UUID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={repairAmount}
                    onChange={(e) => setRepairAmount(e.target.value)}
                    placeholder="Enter amount (use negative to deduct)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={repairCurrency} onValueChange={setRepairCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZMW">ZMW</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Adjustment</Label>
                <Textarea
                  value={repairReason}
                  onChange={(e) => setRepairReason(e.target.value)}
                  placeholder="Explain why this adjustment is being made..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRepairDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRepair}
                disabled={repairMutation.isPending}
              >
                {repairMutation.isPending ? 'Applying...' : 'Apply Adjustment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
