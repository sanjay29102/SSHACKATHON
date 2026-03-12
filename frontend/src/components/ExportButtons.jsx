import React from 'react';
import { Download, Table, FileJson, AlertCircle, Code } from 'lucide-react';
import { apiService } from '../services/apiService';
import { saveToInvoiceHistory } from '../utils/validationEngine';

const ExportButtons = ({ data, disabled }) => {
  const handleExport = (type) => {
    if (disabled) return;

    // Save to history for duplicate detection
    if (data.invoice?.invoice_number) {
      saveToInvoiceHistory(data.invoice.invoice_number);
    }

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
    } else if (type === 'xml') {
      apiService.exportXML(data);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
      <button
        className={`btn btn-primary ${disabled ? 'btn-disabled' : ''}`}
        onClick={() => handleExport('json')}
        disabled={disabled}
      >
        <FileJson size={18} />
        Download JSON
      </button>

      <button
        className={`btn btn-secondary ${disabled ? 'btn-disabled' : ''}`}
        onClick={() => handleExport('csv')}
        disabled={disabled}
      >
        <Table size={18} />
        Export CSV
      </button>

      <button
        className={`btn btn-outline ${disabled ? 'btn-disabled' : ''}`}
        onClick={() => handleExport('xml')}
        disabled={disabled}
        style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
      >
        <Code size={18} />
        Export XML
      </button>

      {disabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold' }}>
          <AlertCircle size={14} />
          Fix errors to export
        </div>
      )}
    </div>
  );
};

export default ExportButtons;
