import { fetchJson } from "../../digikala/http.js";
import { parseProductsFromApi } from "../../digikala/product-parser.js";
import { validateProductId, validateOffset } from "../../digikala/validation.js";

export async function runGetSimilarProducts(
  product_id: number,
  offset?: number
): Promise<Record<string, unknown>> {
  const pv = validateProductId(product_id);
  if (!pv.isValid) throw new Error(pv.errorMarkdown ?? "Invalid product_id");
  const pid = pv.value as number;

  const ov = validateOffset(offset);
  if (!ov.isValid) throw new Error(ov.errorMarkdown ?? "Invalid offset");

  const query: Record<string, number> = {};
  if (ov.value != null) query.offset = ov.value as number;

  const data = (await fetchJson(`https://api.digikala.com/v1/product/${pid}/tabular-recommendation/`, {
    query,
  })) as {
    data?: {
      data?: { title?: string; products?: unknown[] };
      meta?: { offsets?: Array<{ offset?: number; type?: string; title?: string }> };
    };
  };

  const title = String(data?.data?.data?.title ?? "");
  const meta = data?.data?.meta ?? {};
  const availableTabs = (meta?.offsets ?? []).map((t) => ({
    offset: Number(t?.offset ?? 0),
    type: String(t?.type ?? ""),
    title: String(t?.title ?? ""),
  }));

  const prods = (data?.data?.data?.products ?? []) as Parameters<typeof parseProductsFromApi>[0];
  const products = parseProductsFromApi(prods);

  return {
    message:
      "Call get_product_details for promising items; use different offset to explore more recommendation tabs.",
    product_id: pid,
    recommendation_type: title || undefined,
    available_tabs: availableTabs.length > 0 ? availableTabs : undefined,
    products,
  };
}
