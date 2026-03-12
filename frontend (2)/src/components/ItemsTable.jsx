import React from 'react';
import { ShoppingCart, Plus, Trash2, AlertCircle, Receipt, Printer } from 'lucide-react';

const ItemsTable = ({ items, onItemsChange, totals, errors = {}, tax }) => {
  const handleItemChange = (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          newItem.amount = (parseFloat(newItem.qty) || 0) * (parseFloat(newItem.rate) || 0);
        }
        return newItem;
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-bill-section');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Invoice Bill</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; padding: 2rem; color: #1F2937; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
          th, td { border: 1px solid #E5E7EB; padding: 10px 14px; text-align: left; font-size: 13px; }
          th { background: #2563EB; color: white; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .right { text-align: right; }
          .total-row { background: #F0FDF4; font-weight: 700; }
          .grand-total { background: #2563EB; color: white; font-weight: 800; font-size: 15px; }
          .tax-row { color: #6B7280; }
          h2 { color: #2563EB; margin-bottom: 0.5rem; }
          .divider { border-top: 2px dashed #E5E7EB; margin: 1rem 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const cgst = parseFloat(tax?.cgst) || 0;
  const sgst = parseFloat(tax?.sgst) || 0;
  const igst = parseFloat(tax?.igst) || 0;

  return (
    <div className="card">
      <div className="card-title">
        <ShoppingCart size={20} />
        Items Table
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
            onClick={() => onItemsChange([...items, { id: Date.now(), name: "", hsn: "", qty: 0, uom: "Qty", rate: 0, amount: 0, confidence: "high" }])}
          >
            <Plus size={14} /> Add Item
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', color: '#2563EB', borderColor: '#BFDBFE' }}
            onClick={handlePrint}
          >
            <Printer size={14} /> Print Bill
          </button>
        </div>
      </div>

      {/* Editable Items Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="modern-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>HSN</th>
              <th>Quantity</th>
              <th>UOM</th>
              <th>Rate</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const nameError = errors[`items.${index}.name`];
              const hsnError = errors[`items.${index}.hsn`];
              const qtyError = errors[`items.${index}.qty`];
              const rateError = errors[`items.${index}.rate`];
              const amountError = errors[`items.${index}.amount`];

              const getConfidenceBadge = (level) => {
                if (!level) return null;
                const colors = { high: '#22C55E', medium: '#F59E0B', low: '#EF4444' };
                return (
                  <span style={{
                    fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px',
                    color: 'white', backgroundColor: colors[level.toLowerCase()] || 'transparent',
                    fontWeight: '800', marginLeft: '8px', verticalAlign: 'middle'
                  }}>
                    {level.toUpperCase()}
                  </span>
                );
              };

              return (
                <tr key={item.id}>
                  <td style={{ width: '30%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Item Name</span>
                      {getConfidenceBadge(item.confidence)}
                    </div>
                    <input
                      className={`modern-input ${nameError ? 'invalid-field' : ''}`}
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      placeholder="Required"
                    />
                    {nameError && <span className="item-error">{nameError}</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>HSN</div>
                    <input
                      className={`modern-input ${hsnError ? 'invalid-field' : ''}`}
                      value={item.hsn}
                      onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                    />
                    {hsnError && <span className="item-error">{hsnError}</span>}
                  </td>
                  <td style={{ width: '10%' }}>
                    <input
                      className={`modern-input ${qtyError ? 'invalid-field' : ''}`}
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                    />
                    {qtyError && <span className="item-error">{qtyError}</span>}
                  </td>
                  <td style={{ width: '10%' }}>
                    <input className="modern-input" value={item.uom} onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)} />
                  </td>
                  <td>
                    <input
                      className={`modern-input ${rateError ? 'invalid-field' : ''}`}
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                    />
                    {rateError && <span className="item-error">{rateError}</span>}
                  </td>
                  <td style={{ fontWeight: '700', color: amountError ? 'var(--danger)' : 'var(--primary)' }}>
                    ₹{(item.amount || 0).toLocaleString()}
                    {amountError && <div className="item-error">{amountError}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => onItemsChange(items.filter(i => i.id !== item.id))} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bill / Invoice Summary with Tax ── */}
      <div id="invoice-bill-section" style={{
        marginTop: '1.5rem', padding: '1.5rem',
        background: 'linear-gradient(135deg, #FAFBFF, #F5F7FB)',
        borderRadius: '14px', border: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '0.4rem', borderRadius: '8px' }}>
            <Receipt size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1F2937' }}>Invoice Bill</h3>
        </div>

        {/* Bill Items Table */}
        <table style={{
          width: '100%', borderCollapse: 'collapse', marginBottom: '0',
          fontSize: '0.85rem',
        }}>
          <thead>
            <tr style={{ background: '#2563EB' }}>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Name</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>HSN</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qty</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UOM</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rate (₹)</th>
              <th style={{ padding: '0.7rem 1rem', color: 'white', fontWeight: '700', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '0.65rem 1rem', fontWeight: '600', color: '#9CA3AF', fontSize: '0.8rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: '600', color: '#1F2937' }}>{item.name || '—'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#6B7280', fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.hsn || '—'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: '600' }}>{item.qty}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#6B7280' }}>{item.uom || '—'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#374151' }}>₹{(parseFloat(item.rate) || 0).toLocaleString()}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1F2937' }}>₹{(parseFloat(item.amount) || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax & Totals Section */}
        <div style={{
          borderTop: '2px dashed #D1D5DB', marginTop: '0', paddingTop: '1rem',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <div style={{ width: '100%', maxWidth: '320px' }}>
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#374151', fontSize: '0.88rem' }}>
              <span style={{ fontWeight: '600' }}>Subtotal</span>
              <span style={{ fontWeight: '700' }}>₹{(totals.sub_total || 0).toLocaleString()}</span>
            </div>

            {/* Tax Breakdown */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              {cgst > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#6B7280', fontSize: '0.82rem' }}>
                  <span>CGST</span>
                  <span style={{ fontWeight: '600' }}>₹{cgst.toLocaleString()}</span>
                </div>
              )}
              {sgst > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#6B7280', fontSize: '0.82rem' }}>
                  <span>SGST</span>
                  <span style={{ fontWeight: '600' }}>₹{sgst.toLocaleString()}</span>
                </div>
              )}
              {igst > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#6B7280', fontSize: '0.82rem' }}>
                  <span>IGST</span>
                  <span style={{ fontWeight: '600' }}>₹{igst.toLocaleString()}</span>
                </div>
              )}
              {(cgst === 0 && sgst === 0 && igst === 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#9CA3AF', fontSize: '0.82rem' }}>
                  <span>Tax</span>
                  <span style={{ fontWeight: '600' }}>₹0</span>
                </div>
              )}
            </div>

            {/* Tax Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', marginTop: '0.25rem',
              color: errors['totals.tax_total'] ? 'var(--danger)' : '#374151', fontSize: '0.88rem',
              borderTop: '1px solid #E5E7EB',
            }}>
              <span style={{ fontWeight: '600' }}>Tax Total</span>
              <span style={{ fontWeight: '700' }}>₹{(totals.tax_total || 0).toLocaleString()}</span>
            </div>
            {errors['totals.tax_total'] && <p className="item-error" style={{ textAlign: 'right', marginBottom: '0.25rem' }}>{errors['totals.tax_total']}</p>}

            {/* Grand Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
              borderRadius: '10px', color: 'white',
              fontSize: '1.1rem', fontWeight: '800',
            }}>
              <span>Grand Total</span>
              <span>₹{(totals.grand_total || 0).toLocaleString()}</span>
            </div>
            {errors['totals.grand_total'] && <p className="item-error" style={{ textAlign: 'right', marginTop: '0.25rem' }}>{errors['totals.grand_total']}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsTable;
