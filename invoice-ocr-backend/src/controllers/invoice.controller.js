const Invoice = require('../models/invoice.model');
const { extractInvoiceData } = require('../services/gemini.service');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

const extractAndSaveInvoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // Extract data using Gemini
        const extractedData = await extractInvoiceData(filePath, mimeType);

        // Create new invoice record
        const invoice = new Invoice({
            ...extractedData,
            file_path: filePath,
            raw_json: extractedData
        });

        await invoice.save();

        res.status(201).json({
            message: "Invoice extracted and saved successfully",
            data: invoice
        });
    } catch (error) {
        console.error("Extraction Controller Error:", error);
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
        await writeInvoicesToCSV(invoices, csvPath);
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
        await writeInvoicesToCSV([invoice], csvPath);
        res.download(csvPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const writeInvoicesToCSV = async (invoices, filePath) => {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'supplier_name', title: 'Supplier Name' },
            { id: 'supplier_gstin', title: 'GSTIN' },
            { id: 'invoice_number', title: 'Invoice Number' },
            { id: 'date', title: 'Date' },
            { id: 'sub_total', title: 'Sub Total' },
            { id: 'tax_total', title: 'Tax Total' },
            { id: 'grand_total', title: 'Grand Total' },
            { id: 'status', title: 'Status' }
        ]
    });

    const records = invoices.map(inv => ({
        supplier_name: inv.supplier?.name || '',
        supplier_gstin: inv.supplier?.gstin || '',
        invoice_number: inv.invoice?.invoice_number || '',
        date: inv.invoice?.invoice_date || '',
        sub_total: inv.totals?.sub_total || 0,
        tax_total: inv.totals?.tax_total || 0,
        grand_total: inv.totals?.grand_total || 0,
        status: inv.status
    }));

    await csvWriter.writeRecords(records);
};

module.exports = {
    extractAndSaveInvoice,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    exportToCSV,
    exportSingleToCSV
};
