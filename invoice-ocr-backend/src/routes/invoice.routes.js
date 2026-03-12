const express = require('express');
const router = express.Router();
const upload = require('../utils/fileHelper');
const {
    extractAndSaveInvoice,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    exportToCSV
} = require('../controllers/invoice.controller');

// Upload and extract
router.post('/extract', upload.single('invoice'), extractAndSaveInvoice);

// CRUD
router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);

// Export
router.get('/export/csv', exportToCSV);

module.exports = router;
