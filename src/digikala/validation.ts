import { toSafeInteger } from "./converters.js";

export interface ValidationResult {
  isValid: boolean;
  errorMarkdown?: string;
  value?: unknown;
}

export function validateProductId(product_id: unknown): ValidationResult {
  if (typeof product_id !== "number") {
    return {
      isValid: false,
      errorMarkdown: `خطا: product_id باید عدد باشد. مقدار دریافتی: ${typeof product_id}`,
    };
  }
  return { isValid: true, value: toSafeInteger(product_id) };
}

export function validateCategoryId(category_id: unknown): ValidationResult {
  if (typeof category_id !== "number") {
    return {
      isValid: false,
      errorMarkdown: `خطا: category_id باید عدد باشد.`,
    };
  }
  const value = toSafeInteger(category_id);
  if (value <= 0) {
    return {
      isValid: false,
      errorMarkdown: `خطا: category_id نباید 0 یا منفی باشد. برای جستجوی چنددسته‌ای، category_id را حذف کن.`,
    };
  }
  return { isValid: true, value };
}

export function validateKeyword(keyword: unknown): ValidationResult {
  if (typeof keyword !== "string" || !keyword.trim()) {
    return {
      isValid: false,
      errorMarkdown: `خطا: keyword باید رشته غیرخالی باشد.`,
    };
  }
  return { isValid: true, value: keyword };
}

export function validatePage(page: unknown): ValidationResult {
  if (typeof page !== "number") {
    return { isValid: false, errorMarkdown: `خطا: page باید عدد باشد.` };
  }
  return { isValid: true, value: Math.max(1, toSafeInteger(page)) };
}

export function validateSort(sort: unknown): ValidationResult {
  if (typeof sort !== "number") {
    return { isValid: false, errorMarkdown: `خطا: sort باید عدد باشد.` };
  }
  const sortValue = toSafeInteger(sort);
  if (sortValue < 1 || sortValue > 9) {
    return { isValid: false, errorMarkdown: `خطا: sort باید بین 1 تا 9 باشد.` };
  }
  return { isValid: true, value: sortValue };
}

export function validatePrice(
  price: unknown,
  paramName?: "price_min_tooman" | "price_max_tooman"
): ValidationResult {
  if (price === undefined) return { isValid: true, value: undefined };
  if (typeof price !== "number")
    return {
      isValid: false,
      errorMarkdown: `خطا: ${paramName ?? "قیمت"} باید عدد باشد.`,
    };
  return { isValid: true, value: toSafeInteger(price) };
}

export function validateDiscount(
  discount: unknown,
  paramName?: "discount_min" | "discount_max"
): ValidationResult {
  if (discount === undefined) return { isValid: true, value: undefined };
  if (typeof discount !== "number")
    return {
      isValid: false,
      errorMarkdown: `خطا: ${paramName ?? "تخفیف"} باید عدد باشد.`,
    };
  return { isValid: true, value: toSafeInteger(discount) };
}

export function validateOffset(offset: unknown): ValidationResult {
  if (offset === undefined) return { isValid: true, value: undefined };
  if (typeof offset !== "number")
    return { isValid: false, errorMarkdown: `خطا: offset باید عدد باشد.` };
  return { isValid: true, value: toSafeInteger(offset) };
}

export function validateQuery(query: unknown): ValidationResult {
  if (typeof query !== "string" || !query.trim()) {
    return { isValid: false, errorMarkdown: `خطا: query باید رشته غیرخالی باشد.` };
  }
  return { isValid: true, value: query };
}

export function validateColors(colors: unknown): ValidationResult {
  if (colors === undefined) return { isValid: true, value: undefined };
  if (!Array.isArray(colors)) {
    return { isValid: false, errorMarkdown: `خطا: colors باید آرایه اعداد باشد.` };
  }
  for (let i = 0; i < colors.length; i++) {
    if (typeof colors[i] !== "number") {
      return { isValid: false, errorMarkdown: `خطا: رنگ در اندیس ${i} باید عدد باشد.` };
    }
  }
  return { isValid: true, value: colors.map((c) => toSafeInteger(c as number)) };
}
