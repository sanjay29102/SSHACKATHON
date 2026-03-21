/**
 * cnn.service.js
 * Calls the local Python CNN Flask microservice instead of Gemini API.
 * Drop-in replacement for gemini.service.js — same output schema.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const CNN_SERVICE_URL = process.env.CNN_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends a batch of invoice files to the CNN microservice.
 * @param {Array} files - multer file objects (with .path and .mimetype)
 * @returns {Object} { processed_invoices: [...] }
 */
const extractBatchInvoiceData = async (files) => {
    // Check if CNN service is healthy first
    try {
        await axios.get(`${CNN_SERVICE_URL}/health`, { timeout: 3000 });
    } catch (err) {
        throw new Error(
            `CNN Service is not running at ${CNN_SERVICE_URL}. ` +
            `Start it with: cd cnn-service && python app.py`
        );
    }

    const form = new FormData();
    
    for (const file of files) {
        if (!fs.existsSync(file.path)) {
            throw new Error(`File not found: ${file.path}`);
        }
        form.append('files', fs.createReadStream(file.path), {
            filename: file.originalname,
            contentType: file.mimetype
        });
    }

    try {
        const response = await axios.post(`${CNN_SERVICE_URL}/extract`, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 120000,   // 2 min — CNN inference can take time for multiple files
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (!response.data || !response.data.processed_invoices) {
            throw new Error('CNN service returned unexpected response format');
        }

        return response.data;

    } catch (error) {
        if (error.response) {
            const serverMsg = error.response.data?.error || error.response.statusText;
            throw new Error(`CNN Service Error (${error.response.status}): ${serverMsg}`);
        }
        throw new Error(`CNN Service request failed: ${error.message}`);
    }
};

module.exports = { extractBatchInvoiceData };
