const Invoice = require('../models/invoice.model');
const { extractBatchInvoiceData } = require('../services/cnn.service');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const path = require('path');

const extractAndSaveInvoices = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }
        console.log('Starting extraction for files:', req.files.map(f => f.originalname));

        const batchData = await extractBatchInvoiceData(req.files);
        console.log('CNN service returned batch data successfully');

        const savedInvoices = [];
        for (let i = 0; i < batchData.processed_invoices.length; i++) {
            const data = batchData.processed_invoices[i];
            const invoice = new Invoice({
                invoice_category: data.invoice_category,
                supplier: data.supplier,
                invoice: data.invoice,
                items: data.items,
                tax: data.tax,
                totals: data.totals,
                confidence_scores: data.confidence_scores,
                file_path: req.files[i]?.path || 'none',
                raw_json: data
            });
            await invoice.save();
            savedInvoices.push(invoice);
        }

        res.status(201).json({
            message: "Batch processed and categorized successfully",
            total_invoices: savedInvoices.length,
            invoices: savedInvoices
        });
    } catch (error) {
        console.error("Batch Controller Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, status: 'edited' },
            { new: true }
        );
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        res.status(200).json({ message: "Invoice updated", data: invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportToCSV = async (req, res) => {
    try {
        const invoices = await Invoice.find();
        const csvPath = path.join(__dirname, '../../uploads/all_invoices.csv');

        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: [
                { id: 'category', title: 'Category' },
                { id: 'supplier', title: 'Supplier' },
                { id: 'gstin', title: 'GSTIN' },
                { id: 'invoice_no', title: 'Invoice No' },
                { id: 'date', title: 'Date' },
                { id: 'grand_total', title: 'Grand Total' },
                { id: 'confidence_supplier', title: 'Supplier Confidence (%)' },
                { id: 'confidence_total', title: 'Total Confidence (%)' }
            ]
        });

        const records = invoices.map(inv => ({
            category: inv.invoice_category || '',
            supplier: inv.supplier?.name || '',
            gstin: inv.supplier?.gstin || '',
            invoice_no: inv.invoice?.invoice_number || '',
            date: inv.invoice?.invoice_date || '',
            grand_total: inv.totals?.grand_total || 0,
            confidence_supplier: inv.confidence_scores?.supplier_name || 0,
            confidence_total: inv.confidence_scores?.grand_total || 0
        }));

        await csvWriter.writeRecords(records);
        res.download(csvPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportSingleToCSV = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const csvPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number || invoice._id}.csv`);

        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: [
                { id: 'item_category', title: 'Item Category' },
                { id: 'name', title: 'Item' },
                { id: 'hsn', title: 'HSN' },
                { id: 'qty', title: 'Qty' },
                { id: 'rate', title: 'Rate' },
                { id: 'amount', title: 'Amount' }
            ]
        });

        const records = invoice.items.map(item => ({
            item_category: item.item_category || '',
            name: item.item_name || '',
            hsn: item.hsn_code || '',
            qty: item.quantity || 0,
            rate: item.rate || 0,
            amount: item.amount || 0
        }));

        await csvWriter.writeRecords(records);
        res.download(csvPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportSingleToExcel = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Invoice');

        // Header meta
        ws.addRow(['Invoice Category', invoice.invoice_category || 'N/A']);
        ws.addRow(['Supplier', invoice.supplier?.name || '']);
        ws.addRow(['Invoice No', invoice.invoice?.invoice_number || '']);
        ws.addRow(['Invoice Date', invoice.invoice?.invoice_date || '']);
        ws.addRow([]);

        // Items table
        ws.addRow(['Item Category', 'Item', 'Qty', 'Rate', 'Amount']);
        invoice.items.forEach(item => {
            ws.addRow([item.item_category, item.item_name, item.quantity, item.rate, item.amount]);
        });

        ws.addRow([]);
        ws.addRow(['Sub Total', '', '', '', invoice.totals?.sub_total || 0]);
        ws.addRow(['Tax Total', '', '', '', invoice.totals?.tax_total || 0]);
        ws.addRow(['Grand Total', '', '', '', invoice.totals?.grand_total || 0]);

        ws.addRow([]);
        ws.addRow(['-- Confidence Scores --']);
        ws.addRow(['Supplier Name', `${invoice.confidence_scores?.supplier_name || 0}%`]);
        ws.addRow(['GSTIN', `${invoice.confidence_scores?.supplier_gstin || 0}%`]);
        ws.addRow(['Invoice Number', `${invoice.confidence_scores?.invoice_number || 0}%`]);
        ws.addRow(['Grand Total', `${invoice.confidence_scores?.grand_total || 0}%`]);

        const excelPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number || invoice._id}.xlsx`);
        await workbook.xlsx.writeFile(excelPath);
        res.download(excelPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const downloadJSON = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const jsonPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number || invoice._id}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(invoice, null, 2));
        res.download(jsonPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    extractAndSaveInvoices,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    exportToCSV,
    exportSingleToCSV,
    exportSingleToExcel,
    downloadJSON
};
