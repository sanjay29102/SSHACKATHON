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

const extractInvoiceData = async (filePath, mimeType) => {
    const prompt = `
    You are an AI system designed to extract and validate purchase invoice data for accounting automation.
    Analyze the provided invoice image or document carefully and perform the following tasks:
    1. Extract structured invoice information.
    2. Validate financial calculations.
    3. Validate supplier GSTIN format.
    4. Validate item-level calculations.

    Return the output strictly as valid JSON only with no explanations or markdown.

    Extraction Requirements:
    - Supplier Information: supplier_name, gstin, supplier_address, supplier_phone
    - Invoice Information: invoice_number, invoice_date, place_of_supply, payment_terms
    - Items: For each item: name, hsn, qty, uom, rate, amount
    - Tax Information: cgst, sgst, igst
    - Totals: sub_total, tax_total, grand_total

    Validation Requirements:
    1. GSTIN Validation: Check if 15 chars, state code (first 2), PAN (next 10), and structure. Status: "valid" or "invalid".
    2. Item Calculation: qty × rate = expected_amount. Status: "passed" or "failed".
    3. Tax and Total Validation: sub_total + cgst + sgst + igst = expected_grand_total. Status: "passed" or "failed".

    Return the result strictly in this JSON structure:
    {
      "supplier": { "name": "", "gstin": "", "address": "", "phone": "" },
      "invoice": { "invoice_number": "", "invoice_date": "", "place_of_supply": "", "payment_terms": "" },
      "items": [
        {
          "name": "", "hsn": "", "qty": 0, "uom": "", "rate": 0, "amount": 0,
          "calculation_check": { "expected_amount": 0, "status": "passed or failed" }
        }
      ],
      "tax": { "cgst": 0, "sgst": 0, "igst": 0 },
      "totals": { "sub_total": 0, "tax_total": 0, "grand_total": 0 },
      "validation_results": {
        "gstin_validation": { "status": "valid or invalid" },
        "total_validation": { "expected_grand_total": 0, "status": "passed or failed" }
      }
    }

    Important Rules:
    - Return ONLY valid JSON.
    - No markdown formatting (no \`\`\`json blocks).
    - Numeric values must be numbers.
    - If data cannot be detected, return null for that field.
    `;

    try {
        const imagePart = fileToGenerativePart(filePath, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // Clean up text in case Gemini adds markdown code blocks despite instructions
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw new Error("Failed to extract and validate invoice data.");
    }
};

module.exports = { extractInvoiceData };
