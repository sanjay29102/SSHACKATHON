const model = require('../config/gemini');
const fs = require('fs');

/**
 * Converts local file information to a GoogleGenerativeAI.Part object.
 */
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

const extractBatchInvoiceData = async (files) => {
    const prompt = `
    You are an AI system designed to process multiple purchase invoices and categorize them for accounting and financial analysis.
    You will receive a batch of invoice documents. Process ALL of them individually.

    Step 1 — Multi-Invoice Processing
    For each invoice: detect, extract, and normalize data into a consistent structure.
    If a field cannot be detected clearly, return null.

    Step 2 — Extract Invoice Data
    For each invoice extract:
    - Supplier: supplier_name, supplier_gstin, supplier_address, supplier_phone
    - Invoice: invoice_number, invoice_date (ISO YYYY-MM-DD), place_of_supply, payment_terms
    - Items (ALL rows): item_name, hsn_code, quantity, unit_of_measure, rate, amount
    - Tax: cgst, sgst, igst
    - Totals: sub_total, tax_total, grand_total

    Step 3 — Invoice Categorization
    Classify each invoice into one of these categories:
    Textiles, Electronics, Office Supplies, Machinery, Packaging Materials, Raw Materials, Transportation, Services, Utilities, Other
    Also assign an item_category to each item individually.
    Base the invoice_category on the majority of items.
    If unsure, return "Other".

    Step 4 — Confidence Scores
    Estimate a confidence percentage (0–100) for these fields in each invoice:
    - supplier_name: 100 = clearly visible, 70–90 = inferred, 40–60 = uncertain, 0–30 = guessed
    - supplier_gstin
    - invoice_number
    - invoice_date
    - grand_total

    Step 5 — Return structured output

    Output Format — Return ONLY valid JSON, no markdown, no explanation:
    {
      "processed_invoices": [
        {
          "invoice_category": "",
          "supplier": { "name": "", "gstin": "", "address": "", "phone": "" },
          "invoice": { "invoice_number": "", "invoice_date": "", "place_of_supply": "", "payment_terms": "" },
          "items": [
            { "item_name": "", "item_category": "", "hsn_code": "", "quantity": 0, "unit_of_measure": "", "rate": 0, "amount": 0 }
          ],
          "tax": { "cgst": 0, "sgst": 0, "igst": 0 },
          "totals": { "sub_total": 0, "tax_total": 0, "grand_total": 0 },
          "confidence_scores": {
            "supplier_name": 0,
            "supplier_gstin": 0,
            "invoice_number": 0,
            "invoice_date": 0,
            "grand_total": 0
          }
        }
      ]
    }

    Important Rules:
    - Return ONLY valid JSON.
    - No markdown formatting.
    - Do not invent values. If missing, return null.
    - Numbers must be numeric.
    - Dates must be ISO YYYY-MM-DD.
    `;

    try {
        const parts = files.map(file => fileToGenerativePart(file.path, file.mimetype));
        
        const result = await model.generateContent([prompt, ...parts]);
        const response = await result.response;
        const text = response.text();
        
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Batch Extraction Error:", error);
        throw new Error("Failed to process batch of invoices: " + error.message);
    }
};

module.exports = { extractBatchInvoiceData };
