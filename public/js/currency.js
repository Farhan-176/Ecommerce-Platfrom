export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `PKR ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
