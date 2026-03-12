import React from 'react';
import { AlertCircle, CheckCircle2, Building2, FileText } from 'lucide-react';

const ExtractedData = ({ data, onChange, errors = {} }) => {
  const handleSupplierChange = (field, value) => {
    onChange({ ...data, supplier: { ...data.supplier, [field]: value } });
  };

  const handleInvoiceChange = (field, value) => {
    onChange({ ...data, invoice: { ...data.invoice, [field]: value } });
  };

  const getConfidenceColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'medium': return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'low': return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
      default: return null;
    }
  };

  const renderField = (label, value, fieldPath, onChangeFn, type = 'text', confidenceKey) => {
    const error = errors[fieldPath];
    const isInvalid = !!error;
    const confidence = data.confidence?.[confidenceKey];
    const conf = confidence ? getConfidenceColor(confidence) : null;

    return (
      <div style={{ marginBottom: '0.85rem' }}>
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {label}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {conf && (
              <span style={{
                fontSize: '0.6rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px',
                background: conf.bg, color: conf.text, border: `1px solid ${conf.border}`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {confidence}
              </span>
            )}
            {isInvalid
              ? <AlertCircle color="#EF4444" size={13} />
              : value ? <CheckCircle2 color="#22C55E" size={13} /> : null
            }
          </div>
        </div>
        {/* Input */}
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChangeFn(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: `1.5px solid ${isInvalid ? '#FCA5A5' : '#E5E7EB'}`,
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '500',
            color: '#1F2937',
            background: isInvalid ? '#FFF5F5' : '#FAFBFF',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = isInvalid ? '#F87171' : '#93C5FD';
            e.currentTarget.style.boxShadow = `0 0 0 3px ${isInvalid ? 'rgba(239,68,68,0.08)' : 'rgba(37,99,235,0.07)'}`;
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = isInvalid ? '#FCA5A5' : '#E5E7EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {isInvalid && (
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#EF4444', fontWeight: '600' }}>{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '1.1rem' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '0.4rem', borderRadius: '8px' }}>
          <FileText size={16} />
        </div>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1F2937' }}>Extracted Information</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* ── Supplier Info ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Building2 size={13} color="#6366F1" />
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Supplier
            </span>
          </div>
          {renderField('Company Name', data.supplier.name, 'supplier.name', (v) => handleSupplierChange('name', v), 'text', 'supplier_name')}
          {renderField('GSTIN', data.supplier.gstin, 'supplier.gstin', (v) => handleSupplierChange('gstin', v), 'text', 'gstin')}
          {renderField('Phone', data.supplier.phone, 'supplier.phone', (v) => handleSupplierChange('phone', v), 'text', 'phone')}
          {renderField('Address', data.supplier.address, 'supplier.address', (v) => handleSupplierChange('address', v))}
        </div>

        {/* ── Document Details ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <FileText size={13} color="#8B5CF6" />
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Document
            </span>
          </div>
          {renderField('AI Category', data.invoice.ai_category, 'invoice.ai_category', (v) => handleInvoiceChange('ai_category', v), 'text', 'ai_category')}
          {renderField('Invoice Number', data.invoice.invoice_number, 'invoice.invoice_number', (v) => handleInvoiceChange('invoice_number', v))}
          {renderField('Invoice Date', data.invoice.invoice_date, 'invoice.invoice_date', (v) => handleInvoiceChange('invoice_date', v), 'date')}
          {renderField('Place of Supply', data.invoice.place_of_supply, 'invoice.place_of_supply', (v) => handleInvoiceChange('place_of_supply', v))}
          {renderField('Payment Terms', data.invoice.payment_terms, 'invoice.payment_terms', (v) => handleInvoiceChange('payment_terms', v))}
        </div>
      </div>
    </div>
  );
};

export default ExtractedData;
