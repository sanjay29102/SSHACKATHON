export const mockData = {
  supplier: {
    name: "ABC Textiles",
    gstin: "33abcde1234f1z5", // Lower case (should be auto-fixed)
    address: "Tiruppur, TN",
    phone: "+91 98765 43210" // With non-numeric (should be stripped)
  },
  invoice: {
    invoice_number: "INV-2024-001",
    invoice_date: "2024-03-12",
    place_of_supply: "Tamil Nadu",
    payment_terms: "Net 30",
    ai_category: "Raw Materials" // AI automatically flags the spending bucket
  },
  items: [
    { id: 1, name: "Cotton Fabric", hsn: "5208", qty: 100, uom: "Meters", rate: 120, amount: 12500, confidence: "high" }, // Wrong math (should be 12000)
    { id: 2, name: "Polyester Thread", hsn: "5401", qty: 50, uom: "Spoons", rate: 45, amount: 2250, confidence: "medium" }
  ],
  tax: {
    cgst: 1282.5,
    sgst: 1282.5,
    igst: 0
  },
  totals: {
    sub_total: 14750,
    tax_total: 2565,
    grand_total: 17315 // Wrong total
  },
  confidence: {
    supplier_name: "high",
    gstin: "high",
    phone: "medium",
    hsn_code: "low",
    ai_category: "high"
  }
};

export const apiService = {
  processInvoice: async (file) => {
    // Simulate AI processing delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockData
        });
      }, 2000);
    });
  },

  exportCSV: (data) => {
    const headers = ["Item Name", "HSN", "Quantity", "UOM", "Rate", "Amount"];
    const rows = data.items.map(item => [
      item.name, item.hsn, item.qty, item.uom, item.rate, item.amount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportXML: (data) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Invoice>\n';
    
    // Supplier
    xml += '  <Supplier>\n';
    Object.entries(data.supplier).forEach(([key, val]) => {
      xml += `    <${key}>${val}</${key}>\n`;
    });
    xml += '  </Supplier>\n';

    // Invoice Details
    xml += '  <Details>\n';
    Object.entries(data.invoice).forEach(([key, val]) => {
      xml += `    <${key}>${val}</${key}>\n`;
    });
    xml += '  </Details>\n';

    // Items
    xml += '  <Items>\n';
    data.items.forEach(item => {
      xml += '    <Item>\n';
      Object.entries(item).forEach(([key, val]) => {
        if (key !== 'id' && key !== 'confidence') {
          xml += `      <${key}>${val}</${key}>\n`;
        }
      });
      xml += '    </Item>\n';
    });
    xml += '  </Items>\n';

    // Totals
    xml += '  <Totals>\n';
    Object.entries(data.totals).forEach(([key, val]) => {
      xml += `    <${key}>${val}</${key}>\n`;
    });
    xml += '  </Totals>\n';

    xml += '</Invoice>';

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoice_export_${Date.now()}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
