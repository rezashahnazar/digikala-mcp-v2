export function getSortName(sort: number): string {
  const sortNames = [
    "Relevance",
    "Price Low-High",
    "Price High-Low",
    "Newest",
    "Best Selling",
    "Most Viewed",
    "Highest Rated",
    "Fastest Shipping",
    "Buyer Recommendations",
  ];
  return sortNames[sort - 1] ?? "Unknown";
}

export function getApiSortId(sort: number): number {
  const sortIdMap: Record<number, number> = {
    1: 22,
    2: 20,
    3: 21,
    4: 1,
    5: 7,
    6: 4,
    7: 22,
    8: 25,
    9: 27,
  };
  return sortIdMap[sort] ?? 22;
}
