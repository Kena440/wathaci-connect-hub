import { apiFetch, apiGet, apiPost } from '@/lib/api/client';
import type {
  ListingQueryParams,
  ListingResponse,
  MarketplaceListing,
  MarketplaceOrder,
  MarketplaceSavedItem,
} from './types';

const featureEnabled = (flag?: string) => flag === 'true' || flag === true || flag === '1';

export const MARKETPLACE_AI_ENABLED = featureEnabled(import.meta.env.VITE_MARKETPLACE_AI_ENABLED);

export async function fetchMarketplaceListings(params: ListingQueryParams = {}): Promise<ListingResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return apiGet<ListingResponse>(`/api/marketplace/listings${query ? `?${query}` : ''}`);
}

export function fetchMarketplaceListing(slugOrId: string): Promise<MarketplaceListing> {
  return apiGet<MarketplaceListing>(`/api/marketplace/listings/${slugOrId}`);
}

export function createMarketplaceOrder(payload: Partial<MarketplaceOrder>): Promise<MarketplaceOrder> {
  return apiPost<MarketplaceOrder>('/api/marketplace/orders', payload);
}

export function fetchMarketplaceOrders(buyer_profile_id?: string) {
  const query = buyer_profile_id ? `?buyer_profile_id=${buyer_profile_id}` : '';
  return apiGet<{ items: MarketplaceOrder[] }>(`/api/marketplace/orders${query}`);
}

export function fetchSellerOrders(seller_profile_id: string) {
  return apiGet<{ items: MarketplaceOrder[] }>(`/api/marketplace/seller/orders?seller_profile_id=${seller_profile_id}`);
}

export function saveMarketplaceListing(payload: { buyer_profile_id: string; listing_id: string }) {
  return apiPost<MarketplaceSavedItem>('/api/marketplace/saved', payload);
}

export function unsaveMarketplaceListing(buyerId: string, listingId: string) {
  return apiFetch(`/api/marketplace/saved/${buyerId}/${listingId}`, { method: 'DELETE' });
}

export function fetchSavedListings(buyer_profile_id: string) {
  return apiGet<{ items: MarketplaceSavedItem[] }>(`/api/marketplace/saved?buyer_profile_id=${buyer_profile_id}`);
}

export async function fetchAiRecommendations(input: {
  profile?: unknown;
  intent?: string;
  candidates: MarketplaceListing[];
}): Promise<{ recommendations: { id: string; score?: number; reason?: string }[]; fallback?: boolean }> {
  if (!MARKETPLACE_AI_ENABLED) {
    return { recommendations: [], fallback: true };
  }
  try {
    return await apiPost('/api/marketplace/ai/recommend', input);
  } catch (error) {
    console.error('AI recommendation fallback', error);
    return { recommendations: [], fallback: true };
  }
}
