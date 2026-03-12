const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
    value: mongoose.Schema.Types.Mixed,
    confidence: {
        type: Number, // Percentage 0-100
        min: 0,
        max: 100,
        default: 0
    }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    supplier: {
        name: FieldSchema,
        gstin: FieldSchema,
        address: FieldSchema,
        phone: FieldSchema
    },
    invoice: {
        invoice_number: FieldSchema,
        invoice_date: FieldSchema,
        place_of_supply: FieldSchema,
        payment_terms: FieldSchema
    },
    items: [{
        name: FieldSchema,
        hsn: FieldSchema,
        qty: FieldSchema,
        uom: FieldSchema,
        rate: FieldSchema,
        amount: FieldSchema
    }],
    tax: {
        cgst: FieldSchema,
        sgst: FieldSchema,
        igst: FieldSchema
    },
    totals: {
        sub_total: FieldSchema,
        tax_total: FieldSchema,
        grand_total: FieldSchema
    },
    raw_json: Object,
    file_path: String,
    validation_errors: [String],
    status: {
        type: String,
        enum: ['extracted', 'edited', 'validated'],
        default: 'extracted'
    }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
