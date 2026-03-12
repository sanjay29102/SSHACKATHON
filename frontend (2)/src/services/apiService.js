const API_BASE = '/api/invoices';

export const apiService = {
  /**
   * Upload files to the backend for AI extraction.
   * Sends files as multipart/form-data to POST /api/invoices/extract
   * Returns the backend response with extracted invoice data.
   */
  processInvoice: async (files) => {
    const formData = new FormData();

    // Support both single file and array of files
    const fileArray = Array.isArray(files) ? files : [files];
    fileArray.forEach((file) => {
      formData.append('invoices', file);
    });

    const response = await fetch(`${API_BASE}/extract`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header — browser sets it with boundary automatically
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json();

    // Transform backend response to the shape the frontend expects
    // Backend returns: { message, total_invoices, invoices: [...mongoDocuments] }
    // Frontend expects per-invoice: { supplier, invoice, items, tax, totals, confidence }
    const transformedInvoices = result.invoices.map((inv) => {
      return {
        _id: inv._id,
        invoice_category: inv.invoice_category || 'Other',
        supplier: {
          name: inv.supplier?.name || '',
          gstin: inv.supplier?.gstin || '',
          address: inv.supplier?.address || '',
          phone: inv.supplier?.phone || '',
        },
        invoice: {
          invoice_number: inv.invoice?.invoice_number || '',
          invoice_date: inv.invoice?.invoice_date || '',
          place_of_supply: inv.invoice?.place_of_supply || '',
          payment_terms: inv.invoice?.payment_terms || '',
          ai_category: inv.invoice_category || 'Other',
        },
        items: (inv.items || []).map((item, idx) => ({
          id: idx + 1,
          name: item.item_name || '',
          hsn: item.hsn_code || '',
          qty: item.quantity || 0,
          uom: item.unit_of_measure || '',
          rate: item.rate || 0,
          amount: item.amount || 0,
          confidence: 'high',
        })),
        tax: {
          cgst: inv.tax?.cgst || 0,
          sgst: inv.tax?.sgst || 0,
          igst: inv.tax?.igst || 0,
        },
        totals: {
          sub_total: inv.totals?.sub_total || 0,
          tax_total: inv.totals?.tax_total || 0,
          grand_total: inv.totals?.grand_total || 0,
        },
        confidence: {
          supplier_name: inv.confidence_scores?.supplier_name >= 70 ? 'high' : inv.confidence_scores?.supplier_name >= 40 ? 'medium' : 'low',
          gstin: inv.confidence_scores?.supplier_gstin >= 70 ? 'high' : inv.confidence_scores?.supplier_gstin >= 40 ? 'medium' : 'low',
          phone: 'medium',
          hsn_code: 'medium',
          ai_category: 'high',
        },
        confidence_scores: inv.confidence_scores || {},
      };
    });

    return {
      success: true,
      total_invoices: result.total_invoices,
      data: transformedInvoices,
    };
  },

  /** Get all saved invoices from the backend */
  getAllInvoices: async () => {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
  },

  /** Get a single invoice by ID */
  getInvoiceById: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    return response.json();
  },

  /** Export all invoices as CSV (downloads the file) */
  exportAllCSV: () => {
    window.open(`${API_BASE}/export/csv`, '_blank');
  },

  /** Export single invoice as CSV */
  exportSingleCSV: (id) => {
    window.open(`${API_BASE}/${id}/export/csv`, '_blank');
  },

  /** Export single invoice as Excel */
  exportSingleExcel: (id) => {
    window.open(`${API_BASE}/${id}/export/excel`, '_blank');
  },

  /** Download single invoice as JSON */
  downloadJSON: (id) => {
    window.open(`${API_BASE}/${id}/export/json`, '_blank');
  },

  /** Client-side CSV export with full bill details */
  exportCSV: (data) => {
    const cgst = parseFloat(data.tax?.cgst) || 0;
    const sgst = parseFloat(data.tax?.sgst) || 0;
    const igst = parseFloat(data.tax?.igst) || 0;

    let rows = [];
    // Supplier Header
    rows.push(['Invoice Export']);
    rows.push([]);
    rows.push(['Supplier', data.supplier?.name || '']);
    rows.push(['GSTIN', data.supplier?.gstin || '']);
    rows.push(['Phone', data.supplier?.phone || '']);
    rows.push(['Address', data.supplier?.address || '']);
    rows.push([]);
    rows.push(['Invoice #', data.invoice?.invoice_number || '', 'Date', data.invoice?.invoice_date || '']);
    rows.push(['Place of Supply', data.invoice?.place_of_supply || '', 'Payment Terms', data.invoice?.payment_terms || '']);
    rows.push([]);

    // Items header
    const headers = ["#", "Item Name", "HSN", "Quantity", "UOM", "Rate", "Amount"];
    rows.push(headers);

    data.items.forEach((item, idx) => {
      rows.push([
        idx + 1, item.name, item.hsn, item.qty, item.uom, item.rate, item.amount
      ]);
    });

    rows.push([]);
    rows.push(['', '', '', '', '', 'Subtotal', data.totals?.sub_total || 0]);
    if (cgst > 0) rows.push(['', '', '', '', '', 'CGST', cgst]);
    if (sgst > 0) rows.push(['', '', '', '', '', 'SGST', sgst]);
    if (igst > 0) rows.push(['', '', '', '', '', 'IGST', igst]);
    rows.push(['', '', '', '', '', 'Tax Total', data.totals?.tax_total || 0]);
    rows.push(['', '', '', '', '', 'Grand Total', data.totals?.grand_total || 0]);

    // \uFEFF is a UTF-8 Byte Order Mark (BOM) that helps Excel read UTF-8 CSV correctly
    let csvContent = "\uFEFF";
    csvContent += rows.map(row => 
      row.map(cell => {
        let cellStr = String(cell || '');
        // Force strings that look like long numbers (like phone numbers) 
        // to be treated as text in Excel by prepending a tab space.
        if (/^\d{10,15}$/.test(cellStr)) {
          cellStr = `\t${cellStr}`;
        }
        // Also escape any double quotes by doubling them up for valid CSV formatting
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoice_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /** Client-side Excel export using HTML table (Excel-compatible) */
  exportExcel: (data) => {
    const cgst = parseFloat(data.tax?.cgst) || 0;
    const sgst = parseFloat(data.tax?.sgst) || 0;
    const igst = parseFloat(data.tax?.igst) || 0;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background-color: #2563EB; color: white; font-weight: bold; }
        .section-header { background: #EFF6FF; font-weight: bold; font-size: 13px; color: #1E40AF; }
        .total-row { background: #F0FDF4; font-weight: bold; }
        .grand-total { background: #2563EB; color: white; font-weight: bold; font-size: 14px; }
        .right { text-align: right; }
      </style>
      </head><body>
      <h2>Invoice Export</h2>

      <table>
        <tr class="section-header"><td colspan="6">Supplier Information</td></tr>
        <tr><td><b>Company</b></td><td colspan="5">${data.supplier?.name || ''}</td></tr>
        <tr><td><b>GSTIN</b></td><td colspan="2">${data.supplier?.gstin || ''}</td><td><b>Phone</b></td><td colspan="2">${data.supplier?.phone || ''}</td></tr>
        <tr><td><b>Address</b></td><td colspan="5">${data.supplier?.address || ''}</td></tr>
      </table>
      <br/>

      <table>
        <tr class="section-header"><td colspan="6">Invoice Details</td></tr>
        <tr><td><b>Invoice #</b></td><td>${data.invoice?.invoice_number || ''}</td><td><b>Date</b></td><td>${data.invoice?.invoice_date || ''}</td><td><b>Place of Supply</b></td><td>${data.invoice?.place_of_supply || ''}</td></tr>
        <tr><td><b>Payment Terms</b></td><td colspan="2">${data.invoice?.payment_terms || ''}</td><td><b>Category</b></td><td colspan="2">${data.invoice?.ai_category || ''}</td></tr>
      </table>
      <br/>

      <table>
        <tr class="section-header"><td colspan="6">Line Items</td></tr>
        <tr><th>Item Name</th><th>HSN</th><th>Qty</th><th>UOM</th><th>Rate (₹)</th><th>Amount (₹)</th></tr>`;

    (data.items || []).forEach(item => {
      html += `<tr>
        <td>${item.name || ''}</td>
        <td>${item.hsn || ''}</td>
        <td class="right">${item.qty || 0}</td>
        <td>${item.uom || ''}</td>
        <td class="right">${(parseFloat(item.rate) || 0).toLocaleString()}</td>
        <td class="right">${(parseFloat(item.amount) || 0).toLocaleString()}</td>
      </tr>`;
    });

    html += `
        <tr class="total-row"><td colspan="5" class="right">Subtotal</td><td class="right">₹${(data.totals?.sub_total || 0).toLocaleString()}</td></tr>
        <tr><td colspan="5" class="right">CGST</td><td class="right">₹${cgst.toLocaleString()}</td></tr>
        <tr><td colspan="5" class="right">SGST</td><td class="right">₹${sgst.toLocaleString()}</td></tr>
        <tr><td colspan="5" class="right">IGST</td><td class="right">₹${igst.toLocaleString()}</td></tr>
        <tr class="total-row"><td colspan="5" class="right">Tax Total</td><td class="right">₹${(data.totals?.tax_total || 0).toLocaleString()}</td></tr>
        <tr class="grand-total"><td colspan="5" class="right">Grand Total</td><td class="right">₹${(data.totals?.grand_total || 0).toLocaleString()}</td></tr>
      </table>
      </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoice_export_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
