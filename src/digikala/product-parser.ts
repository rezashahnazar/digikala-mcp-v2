import { rialToTooman } from "./converters.js";
import type { ProductItem } from "./types.js";

function calculateRatingStars(rating_count: number, rating_rate: number): number | null {
  return rating_count >= 10 ? Math.round((rating_rate / 20) * 10) / 10 : null;
}

interface ApiProduct {
  id?: unknown;
  title_fa?: unknown;
  title_en?: unknown;
  url?: { uri?: unknown };
  status?: unknown;
  images?: { main?: { url?: unknown[] } };
  default_variant?: {
    price?: {
      selling_price?: unknown;
      rrp_price?: unknown;
      discount_percent?: unknown;
      is_incredible?: unknown;
    };
  };
  rating?: { count?: unknown; rate?: unknown };
  data_layer?: { brand?: unknown; category?: unknown };
  digiplus?: { is_jet_eligible?: unknown };
  colors?: Array<{ id?: unknown; title?: unknown }>;
}

function parseProductFromApi(apiProduct: ApiProduct): ProductItem {
  const default_variant = apiProduct?.default_variant ?? {};
  const price = default_variant?.price ?? {};
  const rating = apiProduct?.rating ?? {};
  const data_layer = apiProduct?.data_layer ?? {};
  const digiplus = apiProduct?.digiplus ?? {};
  const url = apiProduct?.url ?? {};

  const selling_price_rial = Number(price?.selling_price ?? 0);
  const rrp_price_rial = Number(price?.rrp_price ?? 0);
  const rating_count = Number(rating?.count ?? 0);
  const rating_rate = Number(rating?.rate ?? 0);
  const rating_stars = calculateRatingStars(rating_count, rating_rate);

  const imageUrl = apiProduct?.images?.main?.url;
  const firstImage = Array.isArray(imageUrl) && imageUrl.length > 0 ? String(imageUrl[0]) : undefined;

  return {
    id: Number(apiProduct?.id ?? 0),
    title_fa: String(apiProduct?.title_fa ?? ""),
    title_en: apiProduct?.title_en ? String(apiProduct.title_en) : undefined,
    url: String(url?.uri ?? ""),
    image_url: firstImage,
    price: {
      current: rialToTooman(selling_price_rial),
      original: rrp_price_rial > selling_price_rial ? rialToTooman(rrp_price_rial) : undefined,
      discount_percent: Number(price?.discount_percent ?? 0),
      currency: "T",
    },
    rating: {
      stars: rating_stars,
      count: rating_count,
    },
    brand: String(data_layer?.brand ?? ""),
    category: String(data_layer?.category ?? ""),
    badges: [
      price?.is_incredible ? "شگفت‌انگیز" : null,
      digiplus?.is_jet_eligible ? "دیجی‌پلاس جت" : null,
    ].filter((b): b is string => b !== null),
    colors: apiProduct?.colors?.slice(0, 5).map((c) => String(c.title ?? "")),
    in_stock: String(apiProduct?.status ?? "") === "marketable",
  };
}

export function parseProductsFromApi(apiProducts: ApiProduct[]): ProductItem[] {
  const products: ProductItem[] = [];
  for (const p of apiProducts) {
    if (p?.status !== "marketable") continue;
    products.push(parseProductFromApi(p));
  }
  return products;
}

interface Widget {
  type?: unknown;
  data?: {
    widgets?: Array<{
      type?: unknown;
      data?: ApiProduct;
    }>;
  };
}

export function extractProductsFromWidgets(widgets: Widget[]): ProductItem[] {
  const products: ProductItem[] = [];
  for (const w of widgets) {
    if (w?.type === "vertical_product_listing") {
      const inner = w?.data?.widgets ?? [];
      for (const pw of inner) {
        if (pw?.type === "product" && pw?.data) {
          const p = pw.data;
          if (p?.status !== "marketable") continue;
          products.push(parseProductFromApi(p));
        }
      }
    }
  }
  return products;
}
