/**
 * AI Invoice OCR Validation Engine
 * Checks extracted data for completeness, correctness, and logical consistency.
 */

export const validateInvoiceData = (data) => {
  const results = {
    isValid: true,
    errors: {},
    warnings: [],
    stats: {
      totalRules: 0,
      passed: 0
    }
  };

  const addError = (path, message) => {
    results.isValid = false;
    results.errors[path] = message;
  };

  const addWarning = (message) => {
    results.warnings.push(message);
  };

  // 1. Validate Supplier
  const supplier = data.supplier || {};
  if (!supplier.name || supplier.name.length < 3) {
    addError('supplier.name', 'Supplier name is required (min 3 chars)');
  }
  
  const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
  if (!supplier.gstin) {
    addWarning('GSTIN not detected');
  } else if (!gstinRegex.test(supplier.gstin)) {
    addError('supplier.gstin', 'Invalid Indian GSTIN format');
  }

  const phoneRegex = /^\d{10}$/;
  if (supplier.phone && !phoneRegex.test(supplier.phone.replace(/\D/g, ''))) {
    addError('supplier.phone', 'Phone must be 10 digits');
  }

  // 2. Validate Invoice Details
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

  if (!invoice.place_of_supply) {
    addError('invoice.place_of_supply', 'Place of supply is required');
  }

  // 3. Validate Items
  const items = data.items || [];
  if (items.length === 0) {
    addError('items', 'At least one item is required');
  } else {
    items.forEach((item, index) => {
      if (!item.name) addError(`items.${index}.name`, 'Item name required');
      
      const hsnRegex = /^\d{4,8}$/;
      if (item.hsn && !hsnRegex.test(item.hsn)) {
        addError(`items.${index}.hsn`, 'HSN must be 4-8 digits');
      } else if (!item.hsn) {
        addWarning(`HSN code missing for item ${index + 1}`);
      }

      const qty = parseFloat(item.qty);
      const rate = parseFloat(item.rate);
      const amount = parseFloat(item.amount);

      if (isNaN(qty) || qty <= 0) addError(`items.${index}.qty`, 'Qty must be > 0');
      if (isNaN(rate)) addError(`items.${index}.rate`, 'Rate must be a number');
      
      if (!isNaN(qty) && !isNaN(rate) && !isNaN(amount)) {
        if (Math.abs((qty * rate) - amount) > 0.1) {
          addError(`items.${index}.amount`, `Amount mismatch (Expected ${qty * rate})`);
        }
      }
    });
  }

  // 4. Validate Taxes
  const tax = data.tax || { cgst: 0, sgst: 0, igst: 0 };
  const totals = data.totals || { sub_total: 0, tax_total: 0, grand_total: 0 };

  const cgst = parseFloat(tax.cgst) || 0;
  const sgst = parseFloat(tax.sgst) || 0;
  const igst = parseFloat(tax.igst) || 0;
  const taxTotal = parseFloat(totals.tax_total) || 0;

  if (Math.abs((cgst + sgst + igst) - taxTotal) > 0.1) {
    addError('totals.tax_total', 'Tax total mismatch (CGST + SGST + IGST)');
  }

  // 5. Final Totals
  const subTotal = parseFloat(totals.sub_total) || 0;
  const grandTotal = parseFloat(totals.grand_total) || 0;

  if (Math.abs((subTotal + taxTotal) - grandTotal) > 0.1) {
    addError('totals.grand_total', 'Grand Total mismatch (Subtotal + Tax)');
  }

  // 6. Duplicate Detection
  try {
    const history = JSON.parse(localStorage.getItem('invoice_history') || '[]');
    if (invoice.invoice_number && history.includes(invoice.invoice_number)) {
      addWarning(`Duplicate detected: Invoice ${invoice.invoice_number} already in records.`);
    }
  } catch (e) {
    console.error('Failed to read invoice history', e);
  }

  return results;
};

export const saveToInvoiceHistory = (invoiceNumber) => {
  if (!invoiceNumber) return;
  try {
    const history = JSON.parse(localStorage.getItem('invoice_history') || '[]');
    if (!history.includes(invoiceNumber)) {
      history.push(invoiceNumber);
      localStorage.setItem('invoice_history', JSON.stringify(history));
    }
  } catch (e) {
    console.error('Failed to save to invoice history', e);
  }
};
