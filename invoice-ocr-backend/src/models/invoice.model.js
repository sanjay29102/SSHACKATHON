const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    invoice_category: String,
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
        item_name: String,
        item_category: String,
        hsn_code: String,
        quantity: Number,
        unit_of_measure: String,
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
        supplier_name: Number,
        supplier_gstin: Number,
        invoice_number: Number,
        invoice_date: Number,
        grand_total: Number
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
