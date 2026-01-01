import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  Banknote,
  Crown,
  Shield
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useEntitlements } from '@/hooks/useEntitlements';

interface PaymentAccount {
  id: string;
  balance_zmw: number;
  balance_usd: number;
  pending_balance_zmw: number;
  pending_balance_usd: number;
  bank_account_number: string | null;
  bank_name: string | null;
  mobile_money_number: string | null;
  mobile_money_provider: string | null;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  platform_fee: number | null;
  net_amount: number | null;
  status: string;
  description: string | null;
  created_at: string;
  lenco_reference: string | null;
  recipient_id?: string | null;
}

export const WalletDashboard = () => {
  const { user, session } = useAuth();
  const { entitlements, inGracePeriod, hasFullAccess } = useEntitlements();
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState<'ZMW' | 'USD'>('ZMW');
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  const fetchAccountData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch payment account
      const { data: accountData, error: accountError } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (accountError) throw accountError;
      setAccount(accountData);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, [user]);

  const handleWithdraw = async () => {
    if (!session?.access_token || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const balance = withdrawCurrency === 'USD' ? account?.balance_usd : account?.balance_zmw;
    if (!balance || amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-payments', {
        body: {
          action: 'request_payout',
          amount,
          currency: withdrawCurrency
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Withdrawal request submitted');
        setWithdrawDialogOpen(false);
        setWithdrawAmount('');
        fetchAccountData();
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to request withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'successful':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-accent" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      successful: 'default',
      pending: 'secondary',
      processing: 'secondary',
      failed: 'destructive'
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getTransactionIcon = (type: string, userId: string, recipientId?: string) => {
    if (type === 'payout') {
      return <ArrowUpRight className="w-5 h-5 text-destructive" />;
    }
    if (recipientId === userId) {
      return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
    }
    return <ArrowUpRight className="w-5 h-5 text-accent" />;
  };

  const gracePeriodEnd = entitlements?.gracePeriodEnd 
    ? new Date(entitlements.gracePeriodEnd) 
    : new Date('2026-01-20T00:00:00+02:00');
  const daysRemaining = differenceInDays(gracePeriodEnd, new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grace Period / Subscription Status */}
      {inGracePeriod && !entitlements?.subscription && (
        <Card className="bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20">
                  <Crown className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Free Access Active</p>
                  <p className="text-sm text-muted-foreground">
                    All premium features unlocked until {format(gracePeriodEnd, 'MMM d, yyyy')}
                    {daysRemaining > 0 && (
                      <span className="ml-1 text-accent">({daysRemaining} days remaining)</span>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/subscription-plans'}>
                <Shield className="w-4 h-4 mr-1" />
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              ZMW Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              K{(account?.balance_zmw || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {(account?.pending_balance_zmw || 0) > 0 && (
              <p className="text-sm text-primary-foreground/70 mt-1">
                +K{account?.pending_balance_zmw.toFixed(2)} pending
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground border-0">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent-foreground/70 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              USD Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${(account?.balance_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {(account?.pending_balance_usd || 0) > 0 && (
              <p className="text-sm text-accent-foreground/70 mt-1">
                +${account?.pending_balance_usd.toFixed(2)} pending
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Withdraw Funds</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Request a withdrawal to your bank account or mobile money
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-foreground">Currency</Label>
                <Select
                  value={withdrawCurrency}
                  onValueChange={(value: 'ZMW' | 'USD') => setWithdrawCurrency(value)}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="ZMW">ZMW (K{account?.balance_zmw?.toFixed(2)} available)</SelectItem>
                    <SelectItem value="USD">USD (${account?.balance_usd?.toFixed(2)} available)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-background border-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Request Withdrawal'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={fetchAccountData} className="border-border">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-accent" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      {getTransactionIcon(tx.transaction_type, user?.id || '', tx.recipient_id || undefined)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {tx.description || tx.transaction_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.transaction_type === 'payout' ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {tx.transaction_type === 'payout' ? '-' : '+'}
                      {tx.currency === 'USD' ? '$' : 'K'}
                      {tx.amount.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {getStatusIcon(tx.status)}
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletDashboard;
