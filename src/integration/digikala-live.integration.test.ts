/**
 * Live integration tests against https://api.digikala.com
 * Requires network access. Set SKIP_INTEGRATION=1 to skip.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchJson } from "../digikala/http.js";
import { runGetSearchSuggestions } from "../mcp/handlers/get-search-suggestions.js";
import { runSearchProducts } from "../mcp/handlers/search-products.js";
import { runGetProductDetails } from "../mcp/handlers/get-product-details.js";
import { runGetSimilarProducts } from "../mcp/handlers/get-similar-products.js";
import { runSearchTextLenz } from "../mcp/handlers/search-text-lenz.js";
import { runGetProductsBatch } from "../mcp/handlers/get-products-batch.js";
import type { ProductItem } from "../digikala/types.js";

const INTEGRATION_TIMEOUT_MS = 180_000;
const shouldSkip = process.env.SKIP_INTEGRATION === "1";

function pickKeyword(sug: Record<string, unknown>): string {
  const categories = sug.categories as Array<{ keyword?: string }> | undefined;
  const auto = sug.auto_complete as string[] | undefined;
  if (categories?.[0]?.keyword) return String(categories[0].keyword);
  if (auto?.[0]) return String(auto[0]);
  return "موبایل";
}

function asProductList(r: Record<string, unknown>): ProductItem[] {
  const p = r.products;
  if (!Array.isArray(p)) return [];
  return p as ProductItem[];
}

test(
  "Digikala public API (live) — http client and all run* handlers",
  { timeout: INTEGRATION_TIMEOUT_MS, skip: shouldSkip },
  async (t) => {
    let keyword = "موبایل";
    let productIds: number[] = [];
    let marketableId: number | null = null;

    await t.test("fetchJson: autocomplete envelope", async () => {
      const json = (await fetchJson("https://api.digikala.com/v1/autocomplete/", {
        query: { q: "گوشی" },
      })) as { data?: { auto_complete?: unknown[]; categories?: unknown[] } };
      assert.ok(json && typeof json === "object");
      assert.ok(json.data !== undefined);
    });

    await t.test("runGetSearchSuggestions", async () => {
      const r = await runGetSearchSuggestions("لپ تاپ");
      assert.ok(typeof r.query === "string");
      assert.ok(Array.isArray(r.auto_complete) || Array.isArray(r.categories));
      keyword = pickKeyword(r);
      assert.ok(keyword.length > 0);
    });

    await t.test("runSearchProducts", async () => {
      let r = await runSearchProducts({
        keyword,
        page: 1,
        sort: 1,
      });
      let products = asProductList(r);
      if (products.length === 0) {
        r = await runSearchProducts({ keyword: "موبایل", page: 1, sort: 1 });
        products = asProductList(r);
      }
      if (products.length === 0) {
        r = await runSearchProducts({ keyword: "هندزفری", page: 1, sort: 1 });
        products = asProductList(r);
      }
      assert.ok(products.length > 0, "search should return at least one in-stock product for a common keyword");
      productIds = products.map((x) => x.id).filter((id) => id > 0);
      assert.ok(productIds.length > 0);
      const pag = (r as { pagination?: { current_page?: number } }).pagination;
      assert.equal(typeof pag?.current_page, "number");
    });

    await t.test("runGetProductDetails (first marketable id)", async () => {
      for (const id of productIds.slice(0, 10)) {
        const r = await runGetProductDetails(id);
        if (r.unavailable === true) continue;
        assert.ok(typeof (r as { title_fa?: string }).title_fa === "string");
        assert.equal((r as { id?: number }).id, id);
        marketableId = id;
        break;
      }
      assert.ok(
        marketableId !== null,
        "expected at least one marketable product among first search results"
      );
    });

    const mid = marketableId!;

    await t.test("runGetSimilarProducts", async () => {
      const r = await runGetSimilarProducts(mid, undefined);
      assert.ok(Array.isArray(r.products));
    });

    await t.test("runSearchTextLenz (image/style search)", async () => {
      const r = await runSearchTextLenz("کفش مردانه", 1);
      assert.ok(Array.isArray(r.products));
      const p = (r as { pagination?: { total_pages?: number } }).pagination;
      assert.equal(typeof p?.total_pages, "number");
    });

    await t.test("runGetProductsBatch", async () => {
      const extra = productIds.find((i) => i !== mid);
      const batchIds = extra ? [mid, extra] : [mid];
      const r = await runGetProductsBatch(batchIds);
      assert.ok(Array.isArray(r.products));
      assert.ok(
        (r.products as ProductItem[]).length >= 1,
        "batch should load at least the marketable product"
      );
    });
  }
);
