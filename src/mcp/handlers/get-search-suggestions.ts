import { fetchJson } from "../../digikala/http.js";

export async function runGetSearchSuggestions(query: string): Promise<Record<string, unknown>> {
  const data = (await fetchJson("https://api.digikala.com/v1/autocomplete/", {
    query: { q: query },
  })) as {
    data?: {
      auto_complete?: Array<{ keyword?: string }>;
      categories?: Array<{
        category?: {
          id?: number;
          title_fa?: string;
          title_en?: string;
          code?: string;
          url?: { uri?: string };
        };
        keyword?: string;
      }>;
    };
  };

  const autoComplete = (data?.data?.auto_complete ?? [])
    .map((item) => item?.keyword)
    .filter((kw): kw is string => typeof kw === "string");

  const categories = (data?.data?.categories ?? [])
    .map((item) => ({
      keyword: item?.keyword ?? "",
      category: {
        id: item?.category?.id ?? 0,
        title_fa: item?.category?.title_fa ?? "",
        title_en: item?.category?.title_en,
        code: item?.category?.code,
        url: item?.category?.url?.uri ? { uri: item.category.url.uri } : undefined,
      },
    }))
    .filter((item) => item.keyword && item.category.id > 0 && item.category.title_fa);

  return {
    message:
      "Use categories keyword+category pairs or auto_complete keywords for search_products. Always call get_search_suggestions before search_products when exploring keywords.",
    query,
    categories,
    auto_complete: autoComplete,
  };
}
