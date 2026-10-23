/**
 * Formats whole-rupee amounts in Indian format per the PropDesk specification:
 * - 1,85,00,000 -> ₹1.85 Cr
 * - 45,00,000   -> ₹45.0 L
 * - 18,000 (rent) -> ₹18k/mo
 * - 750         -> ₹750
 */
export function formatIndianPrice(amount: number, deal?: "sale" | "rent" | string): string {
  const suffix = deal === "rent" ? "/mo" : "";
  const abs = Math.abs(amount);

  if (abs >= 10_000_000) {
    const cr = amount / 10_000_000;
    const formatted = Number.isInteger(cr)
      ? cr.toFixed(1)
      : cr.toFixed(2).replace(/(\.\d*[1-9])0+$/, "$1");
    return `₹${formatted} Cr${suffix}`;
  }

  if (abs >= 100_000) {
    const lakhs = amount / 100_000;
    const formatted =
      Math.round(lakhs * 10) === lakhs * 10
        ? lakhs.toFixed(1)
        : lakhs.toFixed(2).replace(/0+$/, "");
    return `₹${formatted} L${suffix}`;
  }

  if (abs >= 1_000) {
    const k = amount / 1_000;
    const formatted = Number.isInteger(k) ? k.toString() : k.toFixed(1).replace(/\.0$/, "");
    return `₹${formatted}k${suffix}`;
  }

  return `₹${amount}${suffix}`;
}
