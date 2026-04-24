export interface ProductItem {
  id: number;
  title_fa: string;
  title_en?: string;
  url: string;
  image_url?: string;
  price: {
    current: number;
    original?: number;
    discount_percent: number;
    currency: string;
  };
  rating?: {
    stars: number | null;
    count: number;
  };
  brand?: string;
  category?: string;
  badges?: string[];
  colors?: string[];
  in_stock: boolean;
}

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_items: number;
}
