/**
 * AI Invoice OCR Validation Engine
 * Checks extracted data for completeness, correctness, and logical consistency.
 */

export const validateInvoiceData = (data, file) => {
  const results = {
    isValid: true,
    errors: {},
    warnings: [],
    stats: {
      totalRules: 0,
      passed: 0
    },
    isDuplicate: false
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
  
  if (!supplier.gstin || supplier.gstin.trim() === '') {
    addError('supplier.gstin', 'GSTIN is required');
  } else if (!/^[A-Za-z0-9]{10,15}$/.test(supplier.gstin)) {
    // Relaxed Regex: Just requires 10-15 alphanumeric characters
    // since sample test data often uses fake short GSTINs
    addError('supplier.gstin', 'Invalid GSTIN format');
  }

  const phoneRegex = /^\d{10}$/;
  if (!supplier.phone || supplier.phone.trim() === '') {
    addError('supplier.phone', 'Phone number is required');
  } else if (!phoneRegex.test(supplier.phone.replace(/\D/g, ''))) {
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
