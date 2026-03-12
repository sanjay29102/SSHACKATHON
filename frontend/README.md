# AI Invoice OCR Extraction System (Frontend)

A complete React application designed for high-accuracy invoice data extraction using AI.

## 🚀 Features

- **Drag & Drop Upload**: Supports PDF, JPG, and PNG formats.
- **AI Processing Pipeline**: Real-time visualization of OCR, Analysis, and Generation steps.
- **Dynamic Dashboard**: View extracted supplier details, invoice metadata, and line items.
- **Verification Mode**: Edit any extracted field (item qty, rate, hsn, etc.) with automatic total recalculation.
- **Confidence Scoring**: Visual indicators (High/Medium/Low) for AI extraction reliability.
- **Multi-Format Export**: 
  - Download as structured JSON.
  - Export to CSV for Excel/ERPs.
  - Copy JSON to clipboard.

## 🛠 Tech Stack

- **Framework**: React (Vite)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Custom Design System)

## 📦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `src/components/`: Modular UI units (Upload, Tables, Viewers).
- `src/pages/`: Main application views (Home, Results).
- `src/services/`: API interaction and data processing logic.
- `src/styles/`: Global CSS variables and design tokens.
