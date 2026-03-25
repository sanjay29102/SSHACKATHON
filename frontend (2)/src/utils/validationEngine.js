/**
 * AI Invoice OCR Validation Engine
 * Checks extracted data for completeness, correctness, and logical consistency.
 * 
 * ── Hard errors (block export) ────────────────────────────────────────────────
 *   • Missing supplier name / GSTIN / invoice number / invoice date
 *   • Item name missing or Qty ≤ 0
 *   • Amount clearly wrong (qty × rate mismatch > 5%)
 *   • Tax total or Grand Total arithmetic mismatch (> 1%)
 *
 * ── Warnings (allow export, just flag) ───────────────────────────────────────
 *   • Missing phone / place of supply / payment terms (OCR often misses these)
 *   • Missing HSN codes
 *   • Rate = 0 for an item
 */

export const validateInvoiceData = (data, file) => {
  const results = {
    isValid: true,
    errors: {},
    warnings: [],
    stats: { totalRules: 0, passed: 0 },
    isDuplicate: false
  };

  const addError = (path, message) => {
    results.isValid = false;
    results.errors[path] = message;
  };

  const addWarning = (message) => {
    results.warnings.push(message);
  };

  // ── 1. Supplier ──────────────────────────────────────────────────────────────
  const supplier = data.supplier || {};

  if (!supplier.name || supplier.name.trim().length < 3) {
    addError('supplier.name', 'Supplier name is required (min 3 chars)');
  }

  if (!supplier.gstin || supplier.gstin.trim() === '') {
    addError('supplier.gstin', 'GSTIN is required');
  } else if (!/^[A-Za-z0-9]{10,15}$/.test(supplier.gstin.trim())) {
    addError('supplier.gstin', 'Invalid GSTIN format (10-15 alphanumeric chars)');
  }

  // Phone is optional for OCR – warn only
  if (!supplier.phone || supplier.phone.trim() === '') {
    addWarning('Phone number not found — please verify manually');
  } else if (!/^\d{10}$/.test(supplier.phone.replace(/\D/g, ''))) {
    addWarning('Phone number format may be incorrect (expected 10 digits)');
  }

  // ── 2. Invoice Details ───────────────────────────────────────────────────────
  const invoice = data.invoice || {};

  if (!invoice.invoice_number) {
    addError('invoice.invoice_number', 'Invoice number is required');
  }

  if (!invoice.invoice_date) {
    addError('invoice.invoice_date', 'Invoice date is required');
  } else {
    const invDate = new Date(invoice.invoice_date);
    if (isNaN(invDate.getTime())) {
      addError('invoice.invoice_date', 'Invalid date format');
    } else if (invDate > new Date()) {
      addError('invoice.invoice_date', 'Invoice date cannot be in the future');
    }
  }

  // Place of supply is optional for OCR – warn only
  if (!invoice.place_of_supply) {
    addWarning('Place of supply not found — please verify manually');
  }

  // ── 3. Items ─────────────────────────────────────────────────────────────────
  const items = data.items || [];

  if (items.length === 0) {
    addError('items', 'At least one item is required');
  } else {
    items.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        addError(`items.${index}.name`, 'Item name required');
      }

      const hsnRegex = /^\d{4,8}$/;
      if (item.hsn && !hsnRegex.test(String(item.hsn).trim())) {
        addWarning(`HSN code for item ${index + 1} has unusual format`);
      } else if (!item.hsn) {
        addWarning(`HSN code missing for item ${index + 1}`);
      }

      const qty    = parseFloat(item.qty);
      const rate   = parseFloat(item.rate);
      const amount = parseFloat(item.amount);

      if (isNaN(qty) || qty <= 0) {
        addError(`items.${index}.qty`, 'Quantity must be > 0');
      }

      // Rate = 0 is unusual but can happen (free items, services) – warn only
      if (!isNaN(rate) && rate === 0) {
        addWarning(`Rate is 0 for item ${index + 1} — please verify`);
      }

      // Amount mismatch check: only error if BOTH qty and rate are non-zero
      // AND the mismatch is more than 5% (tolerates small rounding errors)
      if (!isNaN(qty) && !isNaN(rate) && !isNaN(amount) && rate > 0 && qty > 0) {
        const expected = parseFloat((qty * rate).toFixed(2));
        const tolerance = Math.max(expected * 0.05, 1); // 5% or ₹1
        if (Math.abs(expected - amount) > tolerance) {
          addError(`items.${index}.amount`,
            `Amount ₹${amount} doesn't match Qty×Rate (₹${expected})`);
        }
      }
    });
  }

  // ── 4. Tax Totals ────────────────────────────────────────────────────────────
  const tax    = data.tax    || { cgst: 0, sgst: 0, igst: 0 };
  const totals = data.totals || { sub_total: 0, tax_total: 0, grand_total: 0 };

  const cgst     = parseFloat(tax.cgst)          || 0;
  const sgst     = parseFloat(tax.sgst)          || 0;
  const igst     = parseFloat(tax.igst)          || 0;
  const taxTotal = parseFloat(totals.tax_total)  || 0;
  const subTotal = parseFloat(totals.sub_total)  || 0;
  const grandTotal = parseFloat(totals.grand_total) || 0;

  const computedTaxTotal = parseFloat((cgst + sgst + igst).toFixed(2));

  // Tax total check: allow 1% tolerance (handles rounding in OCR)
  if (taxTotal > 0 && Math.abs(computedTaxTotal - taxTotal) > Math.max(taxTotal * 0.01, 0.5)) {
    addError('totals.tax_total', 'Tax total mismatch (CGST + SGST + IGST ≠ Tax Total)');
  }

  // Grand total check: skip if we have nothing to compare
  if (grandTotal > 0 && (subTotal > 0 || taxTotal > 0)) {
    const computedGrand = parseFloat((subTotal + taxTotal).toFixed(2));
    const tolerance = Math.max(grandTotal * 0.01, 1); // 1% or ₹1
    if (Math.abs(computedGrand - grandTotal) > tolerance) {
      addError('totals.grand_total',
        `Grand Total mismatch: Subtotal(₹${subTotal}) + Tax(₹${taxTotal}) ≠ ₹${grandTotal}`);
    }
  }


  // 6. Duplicate Detection
  try {
    const history = JSON.parse(localStorage.getItem('invoice_history') || '[]');
    let isDup = false;
    
    // Check against history objects containing invoice numbers, filenames, and heuristical data
    for (const h of history) {
      if (typeof h === 'string') {
        if (invoice.invoice_number && h === invoice.invoice_number) isDup = true;
      } else if (h && typeof h === 'object') {
        // Direct matches
        if (invoice.invoice_number && h.num === invoice.invoice_number) isDup = true;
        if (file && file.name && h.name === file.name) isDup = true;
        
        // Advanced Heuristical Duplicate Match (same supplier, same precise total)
        if (!isDup && h.total && h.total === grandTotal && h.total > 0) {
           if (supplier.gstin && h.gstin === supplier.gstin) isDup = true;
           if (supplier.name && h.supplier === supplier.name) isDup = true;
        }
      }
    }

    if (isDup) {
      results.isDuplicate = true;
      addWarning(`Duplicate invoice detected: ${invoice.invoice_number || file?.name || 'Unknown'}`);
    }
  } catch (e) {
    console.error('Failed to read invoice history', e);
  }

  return results;
};

export const saveToInvoiceHistory = (data, file) => {
  if (!data) return;
  
  const invoiceNumber = data.invoice?.invoice_number || '';
  const fileName = file?.name || '';
  const gstin = data.supplier?.gstin || '';
  const supplierName = data.supplier?.name || '';
  const total = parseFloat(data.totals?.grand_total) || 0;

  try {
    const history = JSON.parse(localStorage.getItem('invoice_history') || '[]');
    
    // Check if exactly identical
    const exists = history.some(h => {
      if (typeof h === 'string') return h === invoiceNumber;
      return (invoiceNumber && h.num === invoiceNumber) || 
             (fileName && h.name === fileName) || 
             (h.total === total && h.gstin === gstin && total > 0);
    });

    if (!exists) {
      history.push({ 
        num: invoiceNumber, 
        name: fileName, 
        gstin, 
        supplier: supplierName,
        total 
      });
      localStorage.setItem('invoice_history', JSON.stringify(history));
    }
  } catch (e) {
    console.error('Failed to save to invoice history', e);
  }
};
