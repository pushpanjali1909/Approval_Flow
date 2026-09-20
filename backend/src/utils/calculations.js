/**
 * Calculation utilities for line item totals and grand total.
 * Safe numeric handling to avoid floating point precision issues.
 */

function calculateLineTotal(quantity, price) {
  const q = Number(quantity);
  const p = Number(price);
  if (isNaN(q) || isNaN(p)) {
    return 0;
  }
  return Number((q * p).toFixed(2));
}

function calculateGrandTotal(lineItems) {
  if (!Array.isArray(lineItems)) {
    return 0;
  }
  const total = lineItems.reduce((acc, item) => {
    const itemTotal = calculateLineTotal(item.quantity, item.price);
    return acc + itemTotal;
  }, 0);

  return Number(total.toFixed(2));
}

module.exports = {
  calculateLineTotal,
  calculateGrandTotal
};
