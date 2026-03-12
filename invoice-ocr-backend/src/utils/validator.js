/**
 * Smart Validator for Invoice Data
 * Checks for tax mismatches, total discrepancies, and missing mandatory fields.
 */
const validateInvoiceData = (data) => {
    const errors = [];

    // Helper to get nested value safely
    const getValue = (field) => (field && typeof field.value !== 'undefined' ? field.value : null);

    const subTotal = getValue(data.totals?.sub_total) || 0;
    const cgst = getValue(data.tax?.cgst) || 0;
    const sgst = getValue(data.tax?.sgst) || 0;
    const igst = getValue(data.tax?.igst) || 0;
    const grandTotal = getValue(data.totals?.grand_total) || 0;

    // 1. Check Totals (Subtotal + Tax = Grand Total)
    const expectedTotal = subTotal + cgst + sgst + igst;
    // Using a small epsilon for floating point comparison
    if (Math.abs(expectedTotal - grandTotal) > 0.01) {
        errors.push(`Total mismatch detected: Expected ${expectedTotal.toFixed(2)}, but found ${grandTotal.toFixed(2)}`);
    }

    // 2. Check Tax calculations (Simple check if tax exists but subtotal is 0 or vice versa)
    if (subTotal === 0 && (cgst > 0 || sgst > 0 || igst > 0)) {
        errors.push("Tax detected without a Sub-total.");
    }

    // 3. Check Items vs Subtotal
    if (data.items && data.items.length > 0) {
        const itemsSum = data.items.reduce((sum, item) => sum + (getValue(item.amount) || 0), 0);
        if (Math.abs(itemsSum - subTotal) > 0.01) {
            errors.push(`Items total mismatch: Sum of items is ${itemsSum.toFixed(2)}, but Sub-total is ${subTotal.toFixed(2)}`);
        }
    }

    // 4. Missing Mandatory Fields
    if (!getValue(data.supplier?.name)) errors.push("Missing Supplier Name.");
    if (!getValue(data.invoice?.invoice_number)) errors.push("Missing Invoice Number.");
    if (!getValue(data.invoice?.invoice_date)) errors.push("Missing Invoice Date.");
    if (!getValue(data.supplier?.gstin)) errors.push("Missing GSTIN.");

    return errors;
};

module.exports = { validateInvoiceData };
