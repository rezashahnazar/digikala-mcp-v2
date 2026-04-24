import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDigikalaTools } from "./register-tools.js";

const INSTRUCTIONS = `## Digikala MCP

Tools wrap Digikala’s public catalog: autocomplete, search, product details, similar items, visual (text-lenz) search, and batch product cards. **Prices in request/response are in toman** where applicable (the API may use rial internally).

### Recommended tool order
1. **get_search_suggestions** — When exploring keywords or a new product type, call this first with **one short, product-oriented word** (e.g. laptop, perfume, کفش). Use returned **categories[].keyword** and **auto_complete[]** only; do not invent or paraphrase keywords for **search_products**.
2. **search_products** — **keyword** must be an exact value from get_search_suggestions (a category pair or an auto_complete string). If you pass **category_id**, take it and **category_title_fa** from the same suggestion row; **never** send \`category_id: 0\`. Omit **category_id** for multi-category or when the chosen keyword is only from **auto_complete**.
3. **search_products_by_image_description** — For **fashion, shoes, bags, accessories**, use in **addition** to keyword search. Short query: **2–3 words** (e.g. red summer dress, کفش اسپرت مردانه). Does **not** use get_search_suggestions.
4. **get_product_details** — Before recommending or comparing, fetch details for top candidates. If **unavailable: true**, drop that id and try another. Prefer items with **comments_count** and clear **comments_overview** for trust.
5. **get_similar_products** — After a strong candidate, call for **alternatives**; use **offset** when the API exposes multiple tabs.
6. **get_products_batch** — After ids are chosen, load **1–10** product cards in one call for a final shortlist.

If one search is empty or weak, try **other one-word** suggestion queries and **other** category/keyword pairs from get_search_suggestions; do not stop after a single failed attempt. When **search_products** returns **available_filters** (e.g. price range, brands, colors, sub_categories), you may re-call **search_products** with the same keyword/category and tighter **price_*** or **colors** to narrow results.

### Sort (search_products **sort**)
| Intent | sort |
|--------|------|
| Default / relevance | 1 |
| Cheapest first | 2 |
| Most expensive / premium first | 3 |
| Newest | 4 |
| Bestsellers | 5 |
| Most viewed | 6 |
| Highest rating | 7 |
| Fast shipping (e.g. DigiPlus Jet) | 8 |
| Suggested by site | 9 |

### Price / budget
When the user gives a **budget range**, set **both** **price_min_tooman** and **price_max_tooman** (a sensible floor below the top avoids flooding with very cheap irrelevant items). Avoid sending **only** **price_max_tooman** without a minimum when the use case needs a quality floor.

### Output to the user
Summarize in natural language. Cite product titles; when linking, use the canonical Digikala URLs from tool results. **Do not** present large raw API blobs as the whole answer—interpret and condense.

---

## راهنمای کوتاه (فارسی)
- برای کلمه‌ی جدید: اول **get_search_suggestions** با **یک کلمه**؛ **keyword** در **search_products** فقط از خروجی API (دسته یا auto_complete). **search_products** را با keyword ساختگی نزن.
- برای پوشاک/کفش/کیف: علاوه بر جستجوی عادی، **search_products_by_image_description** بزن.
- قبل از پیشنهاد نهایی برای چند کاندید، **get_product_details**؛ برای جایگزین، **get_similar_products**؛ برای کارت نهایی، **get_products_batch**.
- اگر **available_filters** آمد، با همان keyword می‌توان جستجو را فیلتر کرد. بودجه: حتماً **price_min** و **price_max** را با هم تنظیم کن.`;

export function createDigikalaMcpServer(): McpServer {
  const server = new McpServer(
    { name: "digikala", version: "2.0.0" },
    { instructions: INSTRUCTIONS }
  );
  registerDigikalaTools(server);
  return server;
}

export const TOOL_NAMES = [
  "get_search_suggestions",
  "search_products",
  "get_product_details",
  "get_similar_products",
  "search_products_by_image_description",
  "get_products_batch",
] as const;
