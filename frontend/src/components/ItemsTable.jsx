import React from 'react';
import { ShoppingCart, Plus, Trash2, AlertCircle } from 'lucide-react';

const ItemsTable = ({ items, onItemsChange, totals, errors = {} }) => {
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

  return (
    <div className="card">
      <div className="card-title">
        <ShoppingCart size={20} />
        Items Table
        <button
          className="btn btn-outline"
          style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
          onClick={() => onItemsChange([...items, { id: Date.now(), name: "", hsn: "", qty: 0, uom: "Qty", rate: 0, amount: 0, confidence: "high" }])}
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

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
                    fontSize: '0.6rem',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    color: 'white',
                    backgroundColor: colors[level.toLowerCase()] || 'transparent',
                    fontWeight: '800',
                    marginLeft: '8px',
                    verticalAlign: 'middle'
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

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f0f0', paddingTop: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: '600' }}>₹{(totals.sub_total || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Tax Total:</span>
            <span style={{ fontWeight: '600', color: errors['totals.tax_total'] ? 'var(--danger)' : 'inherit' }}>
              ₹{(totals.tax_total || 0).toLocaleString()}
            </span>
          </div>
          {errors['totals.tax_total'] && <p className="item-error" style={{ textAlign: 'right', marginBottom: '0.5rem' }}>{errors['totals.tax_total']}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: errors['totals.grand_total'] ? 'var(--danger)' : 'var(--primary)', fontWeight: '800' }}>
            <span>Total Amount:</span>
            <span>₹{(totals.grand_total || 0).toLocaleString()}</span>
          </div>
          {errors['totals.grand_total'] && <p className="item-error" style={{ textAlign: 'right' }}>{errors['totals.grand_total']}</p>}
        </div>
      </div>
    </div>
  );
};

export default ItemsTable;
