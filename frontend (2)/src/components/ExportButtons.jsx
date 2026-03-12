import React from 'react';
import { Download, Table, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { saveToInvoiceHistory } from '../utils/validationEngine';

const ExportButtons = ({ data, file }) => {
  const handleExport = (type) => {
    // Save to history for duplicate detection using both extraction data and filename
    saveToInvoiceHistory(data, file);

    if (type === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `invoice_validated_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else if (type === 'csv') {
      apiService.exportCSV(data);
    } else if (type === 'excel') {
      apiService.exportExcel(data);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
      <button
        className={`btn btn-primary`}
        onClick={() => handleExport('json')}
        style={{ padding: '0.6rem 1.3rem', fontSize: '0.88rem' }}
      >
        <FileJson size={18} />
        Download JSON
      </button>

      <button
        className={`btn btn-secondary`}
        onClick={() => handleExport('excel')}
        style={{ padding: '0.6rem 1.3rem', fontSize: '0.88rem', background: '#16A34A', boxShadow: '0 4px 15px rgba(22,163,74,0.3)' }}
      >
        <FileSpreadsheet size={18} />
        Export Excel
      </button>

      <button
        className={`btn btn-outline`}
        onClick={() => handleExport('csv')}
        style={{ padding: '0.6rem 1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}
      >
        <Table size={18} />
        Export CSV
      </button>
    </div>
  );
};

export default ExportButtons;
