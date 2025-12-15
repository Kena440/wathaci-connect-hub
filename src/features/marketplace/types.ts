export type ListingType = 'service' | 'digital_product' | 'template' | 'package';

export interface MarketplaceListing {
  id: string;
  title: string;
  slug?: string;
  description: string;
  listing_type: ListingType;
  category: string;
  tags?: string[];
  seller_profile_id?: string;
  price_type?: string;
  price_amount?: number;
  currency?: string;
  delivery_mode?: string[];
  delivery_timeline?: string;
  includes?: string[];
  requirements_from_buyer?: string[];
  cover_image_url?: string;
  asset_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
  moderation_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketplaceOrder {
  id: string;
  buyer_profile_id?: string;
  listing_id: string;
  quantity?: number;
  amount?: number;
  currency?: string;
  status?: string;
  buyer_notes?: string;
  delivery_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketplaceSavedItem {
  id: string;
  buyer_profile_id: string;
  listing_id: string;
  created_at?: string;
  listing?: MarketplaceListing;
}

export interface ListingQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  listing_type?: ListingType;
  delivery_mode?: string | string[];
  tags?: string | string[];
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  q?: string;
}

export interface ListingResponse {
  items: MarketplaceListing[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
