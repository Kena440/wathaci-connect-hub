import { BaseService } from './base-service';
import { supabaseClient } from '@/lib/supabaseClient';
import { withErrorHandling } from '@/lib/supabase-enhanced';
import type { ResourcePurchase, DatabaseResponse } from '@/@types/database';

export class ResourcePurchaseService extends BaseService<ResourcePurchase> {
  constructor() {
    super('resource_purchases');
  }

  async hasPurchased(userId: string, resourceId: number): Promise<DatabaseResponse<boolean>> {
    return withErrorHandling(
      async () => {
        const { data, error } = await supabaseClient
          .from(this.tableName)
          .select('id')
          .eq('user_id', userId)
          .eq('resource_id', resourceId)
          .maybeSingle();

        return { data: !!data, error };
      },
      `${this.tableName}.hasPurchased`
    );
  }

  async recordPurchase(userId: string, resourceId: number): Promise<DatabaseResponse<ResourcePurchase>> {
    return this.create({
      user_id: userId,
      resource_id: resourceId,
      created_at: new Date().toISOString(),
    });
  }
}

export const resourcePurchaseService = new ResourcePurchaseService();
