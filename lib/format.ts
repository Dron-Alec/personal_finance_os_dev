export function formatCurrency(amount: number, fractionDigits: 0 | 2 = 2): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatSignedCurrency(amount: number, fractionDigits: 0 | 2 = 2): string {
  const formatted = formatCurrency(Math.abs(amount), fractionDigits);
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}
