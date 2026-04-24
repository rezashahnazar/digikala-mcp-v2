import { fetchJson } from "../../digikala/http.js";
import { validateProductId } from "../../digikala/validation.js";
import type { ProductItem } from "../../digikala/types.js";

const DIGIKALA_BASE = "https://www.digikala.com";

async function fetchProductDetails(productId: number): Promise<ProductItem | null> {
  const v = validateProductId(productId);
  if (!v.isValid) return null;
  const pid = v.value as number;

  const data = (await fetchJson(`https://api.digikala.com/v2/product/${pid}/`)) as {
    data?: {
      product?: {
        id?: number;
        status?: string;
        title_fa?: string;
        url?: { uri?: string };
        category?: { title_fa?: string };
        brand?: { title_fa?: string };
        rating?: { count?: number; rate?: number };
        default_variant?: {
          price?: {
            selling_price?: number;
            rrp_price?: number;
            discount_percent?: number;
            is_incredible?: boolean;
          };
          digiplus?: { is_jet_eligible?: boolean };
        };
        images?: { main?: { webp_url?: string[] } };
        colors?: Array<{ title?: string }>;
      };
    };
  };

  const product = data?.data?.product ?? {};
  const status = String(product?.status ?? "unknown");

  if (status !== "marketable") return null;

  const price = product.default_variant?.price ?? {};
  const selling = Number(price?.selling_price ?? 0) / 10;
  const rrp = Number(price?.rrp_price ?? 0) / 10;
  const rating = product.rating ?? {};
  const ratingCount = Number(rating?.count ?? 0);
  const ratingRate = Number(rating?.rate ?? 0);
  const stars = ratingCount >= 10 ? Math.round((ratingRate / 20) * 10) / 10 : null;

  const uri = String(product.url?.uri ?? "");
  const url = uri.startsWith("http") ? uri : `${DIGIKALA_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;

  const badges: string[] = [];
  if (price?.is_incredible) badges.push("شگفت‌انگیز");
  if (product.default_variant?.digiplus?.is_jet_eligible) badges.push("دیجی‌پلاس جت");

  return {
    id: pid,
    title_fa: String(product.title_fa ?? ""),
    url,
    image_url: product.images?.main?.webp_url?.[0] ? String(product.images.main.webp_url[0]) : undefined,
    price: {
      current: selling,
      original: rrp > selling ? rrp : undefined,
      discount_percent: Number(price?.discount_percent ?? 0),
      currency: "تومان",
    },
    rating: { stars, count: ratingCount },
    brand: product.brand?.title_fa ? String(product.brand.title_fa) : undefined,
    category: product.category?.title_fa ? String(product.category.title_fa) : undefined,
    badges: badges.length > 0 ? badges : undefined,
    colors: product.colors?.map((c) => String(c.title ?? "")).filter(Boolean),
    in_stock: true,
  };
}

const MAX_BATCH = 10;

export async function runGetProductsBatch(product_ids: number[]): Promise<Record<string, unknown>> {
  if (product_ids.length < 1 || product_ids.length > MAX_BATCH) {
    throw new Error(`product_ids must have between 1 and ${MAX_BATCH} items.`);
  }

  const products: ProductItem[] = [];
  for (const id of product_ids) {
    const product = await fetchProductDetails(id);
    if (product) products.push(product);
  }
  return {
    message: "Use product summaries (title, price, url) in your reply with short justifications per item.",
    products,
  };
}
