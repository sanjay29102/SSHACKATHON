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
    
    The JSON structure should be:
    {
      "supplier": { "name": "", "gstin": "", "address": "", "phone": "" },
      "invoice": { "invoice_number": "", "invoice_date": "", "place_of_supply": "", "payment_terms": "" },
      "items": [ { "name": "", "hsn": "", "qty": 0, "uom": "", "rate": 0, "amount": 0 } ],
      "tax": { "cgst": 0, "sgst": 0, "igst": 0 },
      "totals": { "sub_total": 0, "tax_total": 0, "grand_total": 0 },
      "confidence_scores": { "supplier_name": "High/Medium/Low", "invoice_number": "High/Medium/Low", "total_amount": "High/Medium/Low" }
    }

    Rules:
    1. If a field is missing, use null or an empty string.
    2. Ensure numeric values are numbers, not strings.
    3. If there are multiple items, extract all of them into the "items" array.
    4. Provide a confidence score (High, Medium, or Low) for the key fields mentioned in the structure.
    5. Return ONLY the JSON object, no markdown formatting or extra text.
    `;

    try {
        const imagePart = fileToGenerativePart(filePath, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // Clean up text in case Gemini adds markdown code blocks
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw new Error("Failed to extract data from invoice.");
    }
};

module.exports = { extractInvoiceData };
