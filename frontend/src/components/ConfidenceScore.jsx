import React from 'react';
import { ShieldCheck } from 'lucide-react';

const ConfidenceScore = ({ scores }) => {
  const getBadgeClass = (score) => {
    switch (score?.toLowerCase()) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return '';
    }
  };

  const fields = [
    { key: 'supplier_name', label: 'Supplier Name' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'phone', label: 'Phone' },
    { key: 'hsn_code', label: 'HSN Code' }
  ];

  return (
    <div className="card">
      <h3 className="card-title">
        <ShieldCheck size={20} />
        Validation Confidence
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {fields.map(field => (
          <div key={field.key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.8rem 1rem',
            background: '#F9FAFB',
            borderRadius: '10px',
            border: '1px solid #f0f0f0'
          }}>
            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{field.label}</span>
            <span className={`status-badge ${getBadgeClass(scores[field.key])}`}>
              {scores[field.key] || 'Unkown'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfidenceScore;
