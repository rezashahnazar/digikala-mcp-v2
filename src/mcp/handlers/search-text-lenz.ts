import { fetchJson } from "../../digikala/http.js";
import { parseProductsFromApi } from "../../digikala/product-parser.js";
import { validateQuery, validatePage } from "../../digikala/validation.js";

export async function runSearchTextLenz(
  query: string,
  page: number
): Promise<Record<string, unknown>> {
  const qv = validateQuery(query);
  if (!qv.isValid) throw new Error(qv.errorMarkdown ?? "Invalid query");

  const pv = validatePage(page);
  if (!pv.isValid) throw new Error(pv.errorMarkdown ?? "Invalid page");
  const pg = pv.value as number;

  const data = (await fetchJson("https://api.digikala.com/v1/search/text-lenz/", {
    query: { q: query, page: pg },
  })) as {
    data?: {
      is_text_lenz_eligible?: boolean;
      related_search_words?: unknown[];
      pager?: { current_page?: number; total_pages?: number; total_items?: number };
      products?: unknown[];
    };
  };

  const searchData = data?.data ?? {};
  const pager = searchData?.pager ?? {};
  const prods = (searchData?.products ?? []) as Parameters<typeof parseProductsFromApi>[0];
  const products = parseProductsFromApi(prods);

  return {
    message: "Call get_product_details for candidates; combine with search_products for broader results.",
    query,
    is_ai_enhanced: !!searchData?.is_text_lenz_eligible,
    related_searches: (searchData?.related_search_words ?? []).slice(0, 5).map(String),
    pagination: {
      current_page: Number(pager?.current_page ?? 1),
      total_pages: Number(pager?.total_pages ?? 1),
      total_items: Number(pager?.total_items ?? 0),
    },
    products,
  };
}
