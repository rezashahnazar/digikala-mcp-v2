import { fetchJson } from "../../digikala/http.js";
import { validateProductId } from "../../digikala/validation.js";

export async function runGetProductDetails(product_id: number): Promise<Record<string, unknown>> {
  const v = validateProductId(product_id);
  if (!v.isValid) throw new Error(v.errorMarkdown ?? "Invalid product_id");
  const pid = v.value as number;

  const data = (await fetchJson(`https://api.digikala.com/v2/product/${pid}/`)) as {
    data?: {
      product?: {
        status?: string;
        title_fa?: string;
        url?: { uri?: string };
        category?: { title_fa?: string };
        brand?: { title_fa?: string };
        rating?: { count?: number; rate?: number };
        review?: {
          description?: string;
          attributes?: Array<{ title?: string; values?: unknown[] }>;
        };
        suggestion?: { count?: number; percentage?: number };
        comments_count?: number;
        comments_overview?: {
          id?: number;
          overview?: string;
          advantages?: string[];
          disadvantages?: string[];
        };
        default_variant?: {
          price?: {
            selling_price?: number;
            rrp_price?: number;
            discount_percent?: number;
          };
          seller?: { title?: string; stars?: number; properties?: { is_trusted?: boolean; is_official?: boolean } };
          warranty?: { title_fa?: string };
          digiplus?: { is_jet_eligible?: boolean; fast_shipping_text?: string };
        };
        images?: { main?: { url?: string[]; webp_url?: string[] } };
        colors?: Array<{ title?: string; hex_code?: string }>;
        specifications?: Array<{ title?: string; attributes?: Array<{ title?: string; values?: unknown[] }> }>;
        variants?: Array<{
          id?: number;
          status?: string;
          price?: { selling_price?: number; discount_percent?: number };
          seller?: { title?: string };
        }>;
      };
    };
  };

  const product = data?.data?.product ?? {};
  const status = String(product?.status ?? "unknown");

  if (status !== "marketable") {
    return {
      unavailable: true,
      product_id: pid,
      message: "This product is not available for purchase right now. Try get_similar_products or a new search.",
    };
  }

  const price = product.default_variant?.price ?? {};
  const selling = Number(price?.selling_price ?? 0) / 10;
  const rrp = Number(price?.rrp_price ?? 0) / 10;
  const rating = product.rating ?? {};
  const ratingCount = Number(rating?.count ?? 0);
  const ratingRate = Number(rating?.rate ?? 0);
  const stars = ratingCount >= 10 ? Math.round((ratingRate / 20) * 10) / 10 : null;

  const seller = product.default_variant?.seller;
  const specs = (product.specifications ?? []).map((g) => ({
    group: String(g.title ?? ""),
    items: (g.attributes ?? []).map((a) => ({
      title: String(a.title ?? ""),
      value: String((a.values ?? [])[0] ?? ""),
    })),
  }));

  const variants = (product.variants ?? [])
    .filter((v) => v.status === "marketable")
    .map((v) => ({
      id: Number(v.id ?? 0),
      seller: String(v.seller?.title ?? ""),
      price: Number(v.price?.selling_price ?? 0) / 10,
      discount_percent: v.price?.discount_percent != null ? Number(v.price.discount_percent) : undefined,
    }));

  return {
    message: "For alternatives call get_similar_products. Compare with other options before final choice.",
    id: pid,
    title_fa: String(product.title_fa ?? ""),
    url: String(product.url?.uri ?? ""),
    category: String(product.category?.title_fa ?? ""),
    brand: String(product.brand?.title_fa ?? ""),
    price: {
      current: selling,
      original: rrp > selling ? rrp : undefined,
      discount_percent: Number(price?.discount_percent ?? 0),
    },
    rating: { stars, count: ratingCount },
    seller: seller
      ? {
          name: String(seller.title ?? ""),
          rating: Number(seller.stars ?? 0),
          trusted: !!seller.properties?.is_trusted,
          official: !!seller.properties?.is_official,
        }
      : undefined,
    warranty: product.default_variant?.warranty?.title_fa,
    digiplus: product.default_variant?.digiplus?.is_jet_eligible
      ? { jet_eligible: true, fast_shipping: product.default_variant.digiplus?.fast_shipping_text }
      : undefined,
    image_url: product.images?.main?.webp_url?.[0]
      ? String(product.images.main.webp_url[0])
      : undefined,
    colors: product.colors?.map((c) => ({ name: c.title ?? "", hex: c.hex_code ?? "" })),
    specifications: specs.filter((s) => s.group),
    variants,
    review:
      product.review && (product.review.description || (product.review.attributes?.length ?? 0) > 0)
        ? {
            description: product.review.description ? String(product.review.description) : undefined,
            attributes: Array.isArray(product.review.attributes)
              ? product.review.attributes
                  .map((a) => ({
                    title: String(a.title ?? ""),
                    values: (a.values ?? []).map((v) => String(v)),
                  }))
                  .filter((a) => a.title)
              : undefined,
          }
        : undefined,
    suggestion:
      product.suggestion && (product.suggestion.count != null || product.suggestion.percentage != null)
        ? {
            count: product.suggestion.count != null ? Number(product.suggestion.count) : undefined,
            percentage: product.suggestion.percentage != null ? Number(product.suggestion.percentage) : undefined,
          }
        : undefined,
    comments_count: product.comments_count != null ? Number(product.comments_count) : undefined,
    comments_overview: product.comments_overview
      ? {
          id: product.comments_overview.id != null ? Number(product.comments_overview.id) : undefined,
          overview: product.comments_overview.overview ? String(product.comments_overview.overview) : undefined,
          advantages: Array.isArray(product.comments_overview.advantages)
            ? product.comments_overview.advantages.map((a) => String(a))
            : undefined,
          disadvantages: Array.isArray(product.comments_overview.disadvantages)
            ? product.comments_overview.disadvantages.map((d) => String(d))
            : undefined,
        }
      : undefined,
  };
}
