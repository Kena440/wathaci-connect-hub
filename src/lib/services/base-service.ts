/**
 * Base database service class providing common database operations
 * Note: Uses 'as any' type assertions for table names since Supabase
 * generates strict types, but our generic service needs flexibility
 */

import { supabase, withErrorHandling, withRetry } from '@/lib/supabase-enhanced';
import type { DatabaseResponse, PaginatedResponse, PaginationParams } from '@/@types/database';

export abstract class BaseService<T = any> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: string, select: string = '*'): Promise<DatabaseResponse<T>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from(this.tableName as any)
          .select(select)
          .eq('id', id)
          .single();
        return { data: result.data as T | null, error: result.error };
      },
      `${this.tableName}.findById`
    );
  }

  async findMany(
    filters: Record<string, any> = {},
    pagination: PaginationParams = {},
    select: string = '*'
  ): Promise<DatabaseResponse<PaginatedResponse<T>>> {
    return withErrorHandling(
      async () => {
        const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
          .from(this.tableName as any)
          .select(select, { count: 'exact' })
          .range(from, to)
          .order(sortBy, { ascending: sortOrder === 'asc' });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
          }
        });

        const result = await query;
        const totalCount = result.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        return {
          data: {
            data: (result.data || []) as T[],
            count: totalCount,
            page,
            totalPages,
            hasMore: page < totalPages,
          },
          error: result.error,
        };
      },
      `${this.tableName}.findMany`
    );
  }

  async create(data: Partial<T>): Promise<DatabaseResponse<T>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from(this.tableName as any)
          .insert(data as any)
          .select()
          .single();
        return { data: result.data as T | null, error: result.error };
      },
      `${this.tableName}.create`
    );
  }

  async update(id: string, data: Partial<T>): Promise<DatabaseResponse<T>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from(this.tableName as any)
          .update({ ...data, updated_at: new Date().toISOString() } as any)
          .eq('id', id)
          .select()
          .single();
        return { data: result.data as T | null, error: result.error };
      },
      `${this.tableName}.update`
    );
  }

  async delete(id: string): Promise<DatabaseResponse<void>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from(this.tableName as any)
          .delete()
          .eq('id', id);
        return { data: undefined, error: result.error };
      },
      `${this.tableName}.delete`
    );
  }

  async executeWithRetry<R>(
    operation: () => Promise<{ data: R | null; error: any }>,
    context: string,
    maxRetries: number = 3
  ): Promise<DatabaseResponse<R>> {
    return withRetry(() => withErrorHandling(operation, context), maxRetries);
  }
}
