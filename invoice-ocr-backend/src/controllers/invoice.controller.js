const Invoice = require('../models/invoice.model');
const { extractBatchInvoiceData } = require('../services/gemini.service');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const path = require('path');

const extractAndSaveInvoices = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const batchData = await extractBatchInvoiceData(req.files);

        // Save processed invoices to DB
        const savedInvoices = [];
        for (let i = 0; i < batchData.processed_invoices.length; i++) {
            const data = batchData.processed_invoices[i];
            const invoice = new Invoice({
                ...data,
                file_path: req.files[i]?.path || 'none',
                raw_json: data
            });
            await invoice.save();
            savedInvoices.push(invoice);
        }

        res.status(201).json({
            message: "Batch processed successfully",
            dashboard: batchData.dashboard_summary,
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
                { id: 'supplier', title: 'Supplier' },
                { id: 'gstin', title: 'GSTIN' },
                { id: 'invoice_no', title: 'Invoice No' },
                { id: 'total', title: 'Total' },
                { id: 'status', title: 'Status' }
            ]
        });

        const records = invoices.map(inv => ({
            supplier: inv.supplier?.name || '',
            gstin: inv.supplier?.gstin || '',
            invoice_no: inv.invoice?.invoice_number || '',
            total: inv.totals?.grand_total || 0,
            status: inv.validation_results?.total_validation?.status || 'N/A'
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
                { id: 'name', title: 'Item' },
                { id: 'hsn', title: 'HSN' },
                { id: 'qty', title: 'Qty' },
                { id: 'rate', title: 'Rate' },
                { id: 'amount', title: 'Amount' },
                { id: 'status', title: 'Calc Status' }
            ]
        });

        const records = invoice.items.map(item => ({
            name: item.name || '',
            hsn: item.hsn_code || '',
            qty: item.qty || 0,
            rate: item.rate || 0,
            amount: item.amount || 0,
            status: item.calculation_check?.status || ''
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
            { header: 'Item', key: 'name', width: 30 },
            { header: 'Qty', key: 'qty', width: 10 },
            { header: 'Rate', key: 'rate', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        invoice.items.forEach(item => {
            worksheet.addRow({
                name: item.name,
                qty: item.qty,
                rate: item.rate,
                amount: item.amount,
                status: item.calculation_check?.status
            });
        });

        worksheet.addRow({});
        worksheet.addRow({ name: 'Grand Total', amount: invoice.totals?.grand_total || 0 });

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
