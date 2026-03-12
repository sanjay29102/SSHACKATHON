const mongoose = require('mongoose');

const CorrectionSchema = new mongoose.Schema({
    field_name: String,
    original_value: mongoose.Schema.Types.Mixed,
    corrected_value: mongoose.Schema.Types.Mixed,
    correction_reason: String,
    correction_confidence: Number
}, { _id: false });

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
        hsn_code: String,
        qty: Number,
        uom: String,
        rate: Number,
        amount: Number,
        calculation_check: {
            expected_amount: Number,
            status: String // "passed" or "corrected"
        }
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
    validation_results: {
        gstin_validation_status: String, // "valid" or "invalid"
        total_validation: {
            expected_grand_total: Number,
            status: String // "passed" or "corrected"
        }
    },
    corrections_applied: [CorrectionSchema],
    raw_json: Object,
    file_path: String,
    status: {
        type: String,
        enum: ['extracted', 'edited', 'validated'],
        default: 'extracted'
    }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
