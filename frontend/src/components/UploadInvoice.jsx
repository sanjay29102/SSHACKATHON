import React, { useState } from 'react';
import { Upload } from 'lucide-react';

const UploadInvoice = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = (fileList) => {
    const files = Array.from(fileList);
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`Security Alert: ${file.name} exceeds 5MB limit.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`Invalid format: ${file.name}. Only PDF, JPG, and PNG are allowed.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      <div
        className={`upload-area ${isDragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById('fileInput').click()}
        style={{
          border: '2px dashed #D1D5DB',
          borderRadius: '16px',
          width: '100%',
          padding: '3rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#F9FAFB' : 'transparent',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px'
        }}
      >
        <input
          type="file" id="fileInput" hidden accept=".pdf,.jpg,.jpeg,.png" multiple
          onChange={(e) => e.target.files.length > 0 && handleFilesSelected(e.target.files)}
        />

        <button className="btn" style={{
          background: '#C120C1',
          color: 'white',
          borderRadius: '50px',
          padding: '0.8rem 2.5rem',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
          fontWeight: '700',
          fontSize: '1rem',
          boxShadow: '0 4px 15px rgba(193, 32, 193, 0.3)'
        }}>
          <Upload size={18} /> Browse files
        </button>

        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>
          Drop or paste files here
        </p>
      </div>
    </div>
  );
};

export default UploadInvoice;
