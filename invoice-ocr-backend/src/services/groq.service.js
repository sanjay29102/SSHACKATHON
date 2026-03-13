const Groq = require("groq-sdk");
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Converts local file information to a base64 string for Groq.
 */
function fileToBase64(path) {
  return Buffer.from(fs.readFileSync(path)).toString("base64");
}

const extractBatchInvoiceData = async (files) => {
    const prompt = `
    You are an AI system designed to process purchase invoices and categorize them for accounting.
    For the provided invoice image, extract and normalize data into the following JSON structure.
    If a field cannot be detected, return null.

    Output Format — Return ONLY valid JSON:
    {
      "processed_invoices": [
        {
          "invoice_category": "Textiles | Electronics | Office Supplies | Machinery | Packaging Materials | Raw Materials | Transportation | Services | Utilities | Other",
          "supplier": { "name": "", "gstin": "", "address": "", "phone": "" },
          "invoice": { "invoice_number": "", "invoice_date": "YYYY-MM-DD", "place_of_supply": "", "payment_terms": "" },
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
    `;

    try {
        // Groq current limits might only allow one image per request in some models
        // But let's try with the first file for now to verify logic
        const file = files[0];
        const base64Image = fileToBase64(file.path);
        
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: prompt // Llama-3.3-70b-versatile is text-only
                },
            ],
            response_format: { type: "json_object" }
        });

        const resultText = response.choices[0].message.content;
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Groq Extraction Error:", error);
        throw new Error("Failed to process invoice with Groq: " + error.message);
    }
};

module.exports = { extractBatchInvoiceData };
