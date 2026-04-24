import { fetchJson } from "../../digikala/http.js";
import { toomanToRial } from "../../digikala/converters.js";
import { extractProductsFromWidgets } from "../../digikala/product-parser.js";
import {
  validateCategoryId,
  validateKeyword,
  validatePage,
  validateSort,
  validatePrice,
  validateDiscount,
  validateColors,
} from "../../digikala/validation.js";
import { getApiSortId, getSortName } from "../../digikala/sort-utils.js";

export async function runSearchProducts(args: {
  category_id?: number;
  category_title_fa?: string;
  keyword: string;
  page: number;
  sort: number;
  price_min_tooman?: number;
  price_max_tooman?: number;
  discount_min?: number;
  discount_max?: number;
  colors?: number[];
}): Promise<Record<string, unknown>> {
  const {
    category_id,
    category_title_fa,
    keyword,
    page,
    sort,
    price_min_tooman,
    price_max_tooman,
    discount_min,
    discount_max,
    colors,
  } = args;

  const validations = [
    category_id !== undefined ? validateCategoryId(category_id) : { isValid: true, value: undefined },
    validateKeyword(keyword),
    validatePage(page),
    validateSort(sort),
    validatePrice(price_min_tooman, "price_min_tooman"),
    validatePrice(price_max_tooman, "price_max_tooman"),
    validateDiscount(discount_min, "discount_min"),
    validateDiscount(discount_max, "discount_max"),
    validateColors(colors),
  ];

  for (const v of validations) {
    if (!v.isValid) throw new Error(v.errorMarkdown ?? "Validation error");
  }

  const rawCatId = validations[0].value as number | undefined;
  const catId = rawCatId && rawCatId > 0 ? rawCatId : undefined;
  const kw = validations[1].value as string;
  const pg = validations[2].value as number;
  const srt = validations[3].value as number;
  const pMin = validations[4].value as number | undefined;
  const pMax = validations[5].value as number | undefined;
  const dMin = validations[6].value as number | undefined;
  const dMax = validations[7].value as number | undefined;
  const cols = validations[8].value as number[] | undefined;

  const apiSortId = getApiSortId(srt);
  const query: Record<string, string | number | number[]> = {
    q: kw,
    page: pg,
    sort: apiSortId,
  };
  if (cols?.length) query["colors[]"] = cols;
  if (pMin != null) query["price[min]"] = toomanToRial(pMin);
  if (pMax != null) query["price[max]"] = toomanToRial(pMax);
  if (dMin != null) query["discount[min]"] = dMin;
  if (dMax != null) query["discount[max]"] = dMax;

  const url =
    catId !== undefined
      ? `https://api.digikala.com/v2/category/${catId}/`
      : "https://api.digikala.com/v3/search/";
  const data = (await fetchJson(url, { query })) as {
    data?: { widgets?: unknown[] };
  };

  const widgets = data?.data?.widgets ?? [];
  const products = extractProductsFromWidgets(widgets as Parameters<typeof extractProductsFromWidgets>[0]);
  const listingWidget = (widgets as Array<{ type?: string; data?: { pager?: unknown; filters?: unknown } }>).find(
    (w) => w?.type === "vertical_product_listing"
  );
  const pager = listingWidget?.data?.pager as
    | {
        current_page?: number;
        total_pages?: number;
        total_items?: number;
      }
    | undefined;
  const rawFilters = listingWidget?.data?.filters as
    | {
        price?: { options?: { min?: number; max?: number } };
        brands?: { options?: Array<{ id?: number; title_fa?: string; title_en?: string }> };
        color_palettes?: {
          options?: Array<{ id?: number; title?: string; hex_code?: string }>;
        };
        categories?: {
          options?: Array<{ id?: number; title_fa?: string; products_count?: number }>;
        };
      }
    | undefined;

  const priceOpts = rawFilters?.price?.options;
  const availableFilters =
    priceOpts != null ||
    (rawFilters?.brands?.options?.length ?? 0) > 0 ||
    (rawFilters?.color_palettes?.options?.length ?? 0) > 0
      ? {
          price_range_tooman:
            priceOpts != null
              ? {
                  min: Math.floor((priceOpts.min ?? 0) / 10),
                  max: Math.floor((priceOpts.max ?? 0) / 10),
                }
              : undefined,
          brands:
            rawFilters?.brands?.options?.map((b) => ({
              id: b.id ?? 0,
              title_fa: b.title_fa ?? "",
              title_en: b.title_en,
            })) ?? [],
          colors:
            rawFilters?.color_palettes?.options?.map((c) => ({
              id: c.id ?? 0,
              title: c.title ?? "",
              hex_code: c.hex_code,
            })) ?? [],
          sub_categories:
            rawFilters?.categories?.options?.map((sc) => ({
              id: sc.id ?? 0,
              title_fa: sc.title_fa ?? "",
              products_count: sc.products_count ?? 0,
            })) ?? [],
        }
      : undefined;

  return {
    message:
      "Call get_product_details for top candidates. If needed refine search. For apparel consider search_products_by_image_description.",
    category_title_fa: category_title_fa ?? undefined,
    keyword: kw,
    sort: { id: srt, name: getSortName(srt) },
    pagination: {
      current_page: pager?.current_page ?? pg,
      total_pages: pager?.total_pages ?? 1,
      total_items: pager?.total_items ?? products.length,
    },
    products,
    available_filters: availableFilters,
  };
}
