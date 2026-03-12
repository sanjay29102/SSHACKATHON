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
    You are an expert invoice parser. Extract the following information from the provided invoice image or PDF and return it in a strictly structured JSON format.
    
    CRITICAL: For EVERY single field, you must provide:
    1. "value": The extracted data.
    2. "confidence": A numerical percentage from 0 to 100 representing your confidence in the extraction (e.g., 96).

    If a field is not found, set "value" to null and "confidence" to 0.

    Required JSON Structure:
    {
      "supplier": {
        "name": { "value": "", "confidence": 0 },
        "gstin": { "value": "", "confidence": 0 },
        "address": { "value": "", "confidence": 0 },
        "phone": { "value": "", "confidence": 0 }
      },
      "invoice": {
        "invoice_number": { "value": "", "confidence": 0 },
        "invoice_date": { "value": "", "confidence": 0 },
        "place_of_supply": { "value": "", "confidence": 0 },
        "payment_terms": { "value": "", "confidence": 0 }
      },
      "items": [
        {
          "name": { "value": "", "confidence": 0 },
          "hsn": { "value": "", "confidence": 0 },
          "qty": { "value": 0, "confidence": 0 },
          "uom": { "value": "", "confidence": 0 },
          "rate": { "value": 0, "confidence": 0 },
          "amount": { "value": 0, "confidence": 0 }
        }
      ],
      "tax": {
        "cgst": { "value": 0, "confidence": 0 },
        "sgst": { "value": 0, "confidence": 0 },
        "igst": { "value": 0, "confidence": 0 }
      },
      "totals": {
        "sub_total": { "value": 0, "confidence": 0 },
        "tax_total": { "value": 0, "confidence": 0 },
        "grand_total": { "value": 0, "confidence": 0 }
      }
    }

    Rules:
    1. Numeric values in "value" must be numbers.
    2. Confidence must be an integer between 0 and 100.
    3. Return ONLY the JSON object.
    `;

    try {
        const imagePart = fileToGenerativePart(filePath, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw new Error("Failed to extract data with percentage scores.");
    }
};

module.exports = { extractInvoiceData };
