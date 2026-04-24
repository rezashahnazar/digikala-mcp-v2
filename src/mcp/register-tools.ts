import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runGetSearchSuggestions } from "./handlers/get-search-suggestions.js";
import { runSearchProducts } from "./handlers/search-products.js";
import { runGetProductDetails } from "./handlers/get-product-details.js";
import { runGetSimilarProducts } from "./handlers/get-similar-products.js";
import { runSearchTextLenz } from "./handlers/search-text-lenz.js";
import { runGetProductsBatch } from "./handlers/get-products-batch.js";
import { toolJsonResult } from "./tool-result.js";

export function registerDigikalaTools(mcp: McpServer): void {
  mcp.registerTool(
    "get_search_suggestions",
    {
      description:
        "Digikala autocomplete. Call this before search_products when exploring keywords. Pass a single short word when possible. Copy keywords for search_products from categories[] (keyword + category id/title) or from auto_complete[] only—do not fabricate terms.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "One short, product-like token (1–2 words, e.g. لپ‌تاپ, perfume). No prices, budgets, or long natural-language questions—split those into a simple product word first."
          ),
      },
    },
    async (args) => toolJsonResult(await runGetSearchSuggestions(args.query))
  );

  mcp.registerTool(
    "search_products",
    {
      description:
        "Search the catalog. keyword must be exactly from get_search_suggestions (a categories[].keyword or an auto_complete string). If the response includes available_filters, re-search with the same keyword/category to apply price, brand, or color refinements. Prices are in toman. sort: 1 relevance, 2 price↑, 3 price↓, 4 new, 5 sales, 6 views, 7 rating, 8 fast ship, 9 suggested.",
      inputSchema: {
        category_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Only from get_search_suggestions categories[].category.id for that keyword. Omit for broad or auto_complete-only matches. Never use 0."),
        category_title_fa: z
          .string()
          .optional()
          .describe("categories[].category.title_fa when category_id is set, from the same suggestion row."),
        keyword: z
          .string()
          .describe("Exact string from get_search_suggestions; never a freehand phrase."),
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        sort: z
          .number()
          .int()
          .min(1)
          .max(9)
          .default(1)
          .describe("1 relevance, 2 price asc, 3 price desc, 4 new, 5 sales, 6 views, 7 rating, 8 fast ship, 9 suggested."),
        price_min_tooman: z
          .number()
          .int()
          .optional()
          .describe("Min price (toman). With user budget, set a sensible floor with price_max_tooman."),
        price_max_tooman: z.number().int().optional().describe("Max price (toman)."),
        discount_min: z.number().int().optional().describe("Minimum discount %."),
        discount_max: z.number().int().optional().describe("Maximum discount %."),
        colors: z.array(z.number().int()).optional().describe("Color id list when narrowing via available_filters or known ids."),
      },
    },
    async (args) =>
      toolJsonResult(
        await runSearchProducts({
          category_id: args.category_id,
          category_title_fa: args.category_title_fa,
          keyword: args.keyword,
          page: args.page ?? 1,
          sort: args.sort ?? 1,
          price_min_tooman: args.price_min_tooman,
          price_max_tooman: args.price_max_tooman,
          discount_min: args.discount_min,
          discount_max: args.discount_max,
          colors: args.colors,
        })
      )
  );

  mcp.registerTool(
    "get_product_details",
    {
      description:
        "Deep product view: price, images, seller, warranty, expert review, specifications, and comments overview. Use for finalists before comparing or recommending. If unavailable is true, skip that id. Weight comments_overview and comments_count for quality.",
      inputSchema: {
        product_id: z
          .number()
          .int()
          .describe("Numeric id from search_products, get_similar_products, or batch contexts."),
      },
    },
    async (args) => toolJsonResult(await runGetProductDetails(args.product_id))
  );

  mcp.registerTool(
    "get_similar_products",
    {
      description:
        "Alternatives and related items for a product. Call after get_product_details on a strong candidate to surface substitutes. Vary offset when the API offers multiple recommendation tabs.",
      inputSchema: {
        product_id: z.number().int().describe("Base product id (from search or details)."),
        offset: z
          .number()
          .int()
          .optional()
          .describe("Offset/tab index for different similar-product slices when the API returns multiple groups."),
      },
    },
    async (args) => toolJsonResult(await runGetSimilarProducts(args.product_id, args.offset))
  );

  mcp.registerTool(
    "search_products_by_image_description",
    {
      description:
        "Text-lenz visual style search (apparel, shoes, bags, accessories). Complements keyword search for fashion. Use 2–3 words: color + style + optional gendered term (e.g. red summer dress, کفش اسپرت مردانه). Does not require get_search_suggestions first.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("2–3 words: look and category (e.g. کیف زنانه چرمی, leather men boot)."),
        page: z.number().int().min(1).default(1).describe("Result page (1-based)."),
      },
    },
    async (args) => toolJsonResult(await runSearchTextLenz(args.query, args.page ?? 1))
  );

  mcp.registerTool(
    "get_products_batch",
    {
      description:
        "Fetch 1–10 products by id in one round trip for a final shortlist (card-style fields). Use after ids are selected from search, get_product_details, or get_similar_products.",
      inputSchema: {
        product_ids: z
          .array(z.number().int())
          .min(1)
          .max(10)
          .describe("Between 1 and 10 product ids, no duplicates required by schema but avoid duplicates in practice."),
      },
    },
    async (args) => toolJsonResult(await runGetProductsBatch(args.product_ids))
  );
}
