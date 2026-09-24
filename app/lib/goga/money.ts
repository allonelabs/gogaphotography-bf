/**
 * One money formatter for the whole admin — GEL gets the studio's own
 * "2,000 ₾" shape (Intl's ka-GE/en-US locales render GEL awkwardly), every
 * other currency goes through Intl.NumberFormat as normal.
 */
export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  const cur = (currency || "USD").toUpperCase();
  if (cur === "GEL") {
    const n = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return `${n} ₾`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}
