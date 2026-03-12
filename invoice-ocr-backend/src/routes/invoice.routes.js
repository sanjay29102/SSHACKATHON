const express = require('express');
const router = express.Router();
const upload = require('../utils/fileHelper');
const {
    extractAndSaveInvoice,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    exportToCSV,
    exportSingleToCSV,
    exportSingleToExcel,
    downloadJSON
} = require('../controllers/invoice.controller');

// Upload and extract
router.post('/extract', upload.single('invoice'), extractAndSaveInvoice);

// CRUD
router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);

// Export/Download
router.get('/export/csv', exportToCSV); // All invoices
router.get('/:id/export/csv', exportSingleToCSV); // Single invoice detailed
router.get('/:id/export/excel', exportSingleToExcel); // Single invoice excel
router.get('/:id/export/json', downloadJSON); // Single invoice JSON file

module.exports = router;
