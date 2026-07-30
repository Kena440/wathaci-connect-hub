// Shared, idempotent subscription activation used by both the Lenco webhook
// (primary path) and the manual `verify` action in lenco-payments (safety net).
//
// Given a successful transaction of type 'subscription' that references a
// subscription_id, flip the linked subscription to 'active' unless it already
// is. The `.neq('status', 'active')` guard makes concurrent calls (webhook +
// manual verify arriving close together) a no-op for whichever runs second.

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export interface ActivatableTransaction {
  id?: string;
  transaction_type?: string | null;
  subscription_id?: string | null;
}

export interface ActivationResult {
  applicable: boolean;
  activated: boolean;
  alreadyActive: boolean;
  error?: string;
}

export async function activateSubscriptionForTransaction(
  supabase: SupabaseClientLike,
  transaction: ActivatableTransaction,
): Promise<ActivationResult> {
  if (transaction?.transaction_type !== 'subscription' || !transaction?.subscription_id) {
    return { applicable: false, activated: false, alreadyActive: false };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('id', transaction.subscription_id)
    .neq('status', 'active')
    .select('id');

  if (error) {
    console.error('Subscription activation error:', error);
    return { applicable: true, activated: false, alreadyActive: false, error: error.message };
  }

  const activated = Array.isArray(data) && data.length > 0;

  if (activated) {
    console.log(`Subscription ${transaction.subscription_id} activated`);
  } else {
    console.log(`Subscription ${transaction.subscription_id} already active — no change`);
  }

  return { applicable: true, activated, alreadyActive: !activated };
}
