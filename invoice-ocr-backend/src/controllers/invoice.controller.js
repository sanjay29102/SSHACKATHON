const Invoice = require('../models/invoice.model');
const { extractInvoiceData } = require('../services/gemini.service');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const path = require('path');
const { validateInvoiceData } = require('../utils/validator');

const extractAndSaveInvoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        const extractedData = await extractInvoiceData(filePath, mimeType);

        // Run Smart Validation
        const validationErrors = validateInvoiceData(extractedData);

        const invoice = new Invoice({
            ...extractedData,
            file_path: filePath,
            validation_errors: validationErrors,
            raw_json: extractedData
        });

        await invoice.save();

        res.status(201).json({
            message: "Invoice extracted with percentage confidence",
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
        // Re-run validation on the updated data
        const validationErrors = validateInvoiceData(req.body);

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, status: 'edited', validation_errors: validationErrors },
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

        const csvPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number?.value || invoice._id}.csv`);
        
        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: [
                { id: 'name', title: 'Item' },
                { id: 'qty', title: 'Qty' },
                { id: 'rate', title: 'Rate' },
                { id: 'amount', title: 'Amount' }
            ]
        });

        const records = invoice.items.map(item => ({
            name: `${item.name?.value || ''} (${item.name?.confidence || 0}%)`,
            qty: `${item.qty?.value || 0} (${item.qty?.confidence || 0}%)`,
            rate: `${item.rate?.value || 0} (${item.rate?.confidence || 0}%)`,
            amount: `${item.amount?.value || 0} (${item.amount?.confidence || 0}%)`
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
        const worksheet = workbook.addWorksheet('Invoice');

        worksheet.columns = [
            { header: 'Item', key: 'name', width: 40 },
            { header: 'Qty', key: 'qty', width: 15 },
            { header: 'Rate', key: 'rate', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 }
        ];

        invoice.items.forEach(item => {
            worksheet.addRow({
                name: `${item.name?.value} (${item.name?.confidence}%)`,
                qty: `${item.qty?.value} (${item.qty?.confidence}%)`,
                rate: `${item.rate?.value} (${item.rate?.confidence}%)`,
                amount: `${item.amount?.value} (${item.amount?.confidence}%)`
            });
        });

        worksheet.addRow({});
        worksheet.addRow({ 
            name: `Grand Total (${invoice.totals?.grand_total?.confidence}%)`, 
            amount: invoice.totals?.grand_total?.value || 0 
        });

        const excelPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number?.value || invoice._id}.xlsx`);
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
        
        const jsonPath = path.join(__dirname, `../../uploads/invoice_${invoice.invoice?.invoice_number?.value || invoice._id}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(invoice, null, 2));
        res.download(jsonPath);
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
        supplier_name: `${inv.supplier?.name?.value || ''} (${inv.supplier?.name?.confidence || 0}%)`,
        supplier_gstin: `${inv.supplier?.gstin?.value || ''} (${inv.supplier?.gstin?.confidence || 0}%)`,
        invoice_number: `${inv.invoice?.invoice_number?.value || ''} (${inv.invoice?.invoice_number?.confidence || 0}%)`,
        date: `${inv.invoice?.invoice_date?.value || ''} (${inv.invoice?.invoice_date?.confidence || 0}%)`,
        sub_total: inv.totals?.sub_total?.value || 0,
        tax_total: inv.totals?.tax_total?.value || 0,
        grand_total: inv.totals?.grand_total?.value || 0,
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
    exportSingleToCSV,
    exportSingleToExcel,
    downloadJSON
};
