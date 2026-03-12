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
    You are an AI financial document intelligence system designed to process, validate, correct, and summarize purchase invoices for accounting automation.
    You have received a batch of invoice documents. Process EVERY invoice carefully.

    Step 1 — Multi-Invoice Extraction
    For each document, extract:
    - Supplier: name, gstin, address, phone
    - Invoice: invoice_number, invoice_date (ISO YYYY-MM-DD), place_of_supply, payment_terms
    - Items: name, hsn_code, qty, uom, rate, amount
    - Tax: cgst, sgst, igst
    - Totals: sub_total, tax_total, grand_total

    Step 2 — AI Auto-Correction and Validation
    - Item Calculation: Verify qty × rate = amount. If wrong, recalculate and set status to "corrected", original stays in corrections list.
    - Tax/Total Validation: Verify sub_total + taxes = grand_total. If wrong, recalculate and set status to "corrected".
    - GSTIN: Check if valid Indian GST format (15 chars, state code, etc). Status: valid/invalid.
    - OCR Error Detection: Correct obvious mistakes. Track corrections in "corrections_applied" list: { field_name, original_value, corrected_value, correction_reason, correction_confidence }.

    Step 3 — Invoice Summary Dashboard Generation
    Generate analytics across ALL processed invoices:
    - General: total_invoices_processed, total_invoice_amount, total_tax_amount, average_invoice_value
    - Supplier: top_suppliers_by_total_invoice_value, most_frequent_supplier, supplier_invoice_counts
    - Insights: duplicate_invoice_numbers, invoices_with_missing_fields, invoices_with_validation_errors
    - Time Analysis: monthly_invoice_totals, highest_spending_month

    Output Format:
    Return ONLY valid JSON in this structure:
    {
      "processed_invoices": [
        {
          "supplier": { "name": "", "gstin": "", "address": "", "phone": "" },
          "invoice": { "invoice_number": "", "invoice_date": "", "place_of_supply": "", "payment_terms": "" },
          "items": [
            { "name": "", "hsn_code": "", "qty": 0, "uom": "", "rate": 0, "amount": 0, "calculation_check": { "expected_amount": 0, "status": "passed or corrected" } }
          ],
          "tax": { "cgst": 0, "sgst": 0, "igst": 0 },
          "totals": { "sub_total": 0, "tax_total": 0, "grand_total": 0 },
          "validation_results": { "gstin_validation_status": "valid or invalid", "total_validation": { "expected_grand_total": 0, "status": "passed or corrected" } },
          "corrections_applied": []
        }
      ],
      "dashboard_summary": {
        "general_metrics": {},
        "supplier_insights": {},
        "invoice_insights": {},
        "time_analysis": {}
      }
    }

    Important Rules:
    - Return ONLY valid JSON. No markdown.
    - Normalized dates to ISO YYYY-MM-DD.
    - Numbers MUST be numbers.
    - No explanations.
    `;

    try {
        const parts = files.map(file => fileToGenerativePart(file.path, file.mimetype));
        
        const result = await model.generateContent([prompt, ...parts]);
        const response = await result.response;
        const text = response.text();
        console.log("Raw Gemini Output:", text);
        
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Batch Extraction Error:", error);
        throw new Error("Failed to process batch of invoices: " + error.message);
    }
};

module.exports = { extractBatchInvoiceData };
