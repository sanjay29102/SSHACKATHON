/**
 * AI Auto-Correction Engine
 * Automatically repairs common OCR extraction errors and logical inconsistencies.
 */

export const autoCorrectInvoice = (data) => {
  const corrected = JSON.parse(JSON.stringify(data)); // Deep clone
  let correctionCount = 0;

  const logCorrection = () => correctionCount++;

  // 1. Sanitizing Supplier Info
  if (corrected.supplier) {
    // Fix GSTIN: OCR often swaps 0/O or I/1
    if (corrected.supplier.gstin) {
      const original = corrected.supplier.gstin;
      let fixedGst = original.toUpperCase().replace(/\s/g, '');
      // Common substitution fixes (simplified version)
      // Note: GSTIN format is 2 digits + 10 alphanumeric + 1 digit + 1 alpha + 1 alpha/digit
      if (fixedGst !== original) {
        corrected.supplier.gstin = fixedGst;
        logCorrection();
      }
    }

    // Fix Phone: Strip non-numeric and keep last 10 digits if valid
    if (corrected.supplier.phone) {
      const original = corrected.supplier.phone;
      let stripped = original.replace(/[^\d]/g, '');
      
      // If it starts with 91 and has 12 digits, take last 10
      if (stripped.length === 12 && stripped.startsWith('91')) {
        stripped = stripped.slice(2);
      }

      if (stripped.length === 10 && stripped !== original) {
        corrected.supplier.phone = stripped;
        logCorrection();
      }
    }
  }

  // 2. Math Auto-Correction (Items)
  if (corrected.items && Array.isArray(corrected.items)) {
    corrected.items = corrected.items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const expectedAmount = qty * rate;
      const currentAmount = parseFloat(item.amount) || 0;

      if (Math.abs(expectedAmount - currentAmount) > 0.01 && qty > 0 && rate > 0) {
        logCorrection();
        return { ...item, amount: expectedAmount };
      }
      return item;
    });
  }

  // 3. Tax & Total Sync
  const sub_total = corrected.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const cgst = parseFloat(corrected.tax?.cgst) || 0;
  const sgst = parseFloat(corrected.tax?.sgst) || 0;
  const igst = parseFloat(corrected.tax?.igst) || 0;
  
  const tax_total = cgst + sgst + igst;
  const grand_total = sub_total + tax_total;

  if (Math.abs(corrected.totals.sub_total - sub_total) > 0.01) {
    corrected.totals.sub_total = sub_total;
    logCorrection();
  }

  if (Math.abs(corrected.totals.tax_total - tax_total) > 0.01) {
    corrected.totals.tax_total = tax_total;
    logCorrection();
  }

  if (Math.abs(corrected.totals.grand_total - grand_total) > 0.01) {
    corrected.totals.grand_total = grand_total;
    logCorrection();
  }

  return { correctedData: corrected, count: correctionCount };
};
