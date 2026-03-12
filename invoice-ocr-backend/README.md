# AI Invoice OCR Extraction System (Backend)

An AI-powered system that handles purchase invoice extraction using Gemini 1.5 Flash. It reads PDFs and images, extracts structured JSON, allows manual edits, and exports to multiple formats (CSV, Excel, JSON).

## ✨ Features

- **Multimodal OCR**: Direct PDF/Image extraction via Google Gemini 1.5 Flash.
- **Structured Data**: Extracts Supplier, Invoice details, Items, Taxes, and Totals.
- **Confidence Scores**: AI-assigned confidence (High/Medium/Low) for extracted fields.
- **Manual Edits**: Update any extracted field before final export.
- **Multi-Format Export**:
  - Detailed Item-level CSV (`Item, Qty, Rate, Amount`).
  - Professional Excel (`.xlsx`) via `exceljs`.
  - Raw JSON download.
- **Database**: MongoDB storage for persistence.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed.
- MongoDB running locally (`mongodb://localhost:27017`).

### 2. Setup
1. Navigate to the folder: `cd invoice-ocr-backend`
2. Install dependencies: `npm install`
3. Configure environment: Create a `.env` file (or use the one I generated) with:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017
   GEMINI_API_KEY=your_key_here
   ```

### 3. Run
```bash
npm start
# OR
node src/server.js
```

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/invoices/extract` | Upload file & extract data |
| `GET` | `/api/invoices` | List all invoices |
| `PUT` | `/api/invoices/:id` | Update/Edit an invoice record |
| `GET` | `/api/invoices/:id/export/csv` | Download detailed items CSV |
| `GET` | `/api/invoices/:id/export/excel` | Download professional Excel |
| `GET` | `/api/invoices/:id/export/json` | Download JSON file |

## 🛠 Tech Stack
- **Backend**: Node.js, Express.js
- **AI**: Google Generative AI (Gemini 1.5 Flash)
- **Database**: MongoDB (Mongoose)
- **Exports**: `csv-writer`, `exceljs`
