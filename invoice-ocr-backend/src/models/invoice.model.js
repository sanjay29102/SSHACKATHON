const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    supplier: {
        name: String,
        gstin: String,
        address: String,
        phone: String
    },
    invoice: {
        invoice_number: String,
        invoice_date: String,
        place_of_supply: String,
        payment_terms: String
    },
    items: [{
        name: String,
        hsn: String,
        qty: Number,
        uom: String,
        rate: Number,
        amount: Number
    }],
    tax: {
        cgst: Number,
        sgst: Number,
        igst: Number
    },
    totals: {
        sub_total: Number,
        tax_total: Number,
        grand_total: Number
    },
    confidence_scores: {
        type: Map,
        of: String // High, Medium, Low
    },
    raw_json: Object,
    file_path: String,
    status: {
        type: String,
        enum: ['extracted', 'edited', 'validated'],
        default: 'extracted'
    }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
