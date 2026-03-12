import React from 'react';
import { PieChart, CheckCircle2, AlertCircle, IndianRupee, FileText } from 'lucide-react';

const InvoiceSummaryDashboard = ({ fileStates, onSelectInvoice }) => {
  const totalInvoices = fileStates.length;
  const processedInvoices = fileStates.filter(f => f.isProcessed);
  const validInvoices = processedInvoices.filter(f => f.validation.isValid);
  const invalidInvoices = processedInvoices.filter(f => !f.validation.isValid);

  const totalAmount = validInvoices.reduce((sum, f) => sum + (parseFloat(f.data?.totals?.grand_total) || 0), 0);
  const totalTax = validInvoices.reduce((sum, f) => sum + (parseFloat(f.data?.totals?.tax_total) || 0), 0);

  // Categorize valid spend
  const categorySpend = validInvoices.reduce((acc, f) => {
    const cat = f.data?.invoice?.ai_category || 'Uncategorized';
    const amount = parseFloat(f.data?.totals?.grand_total) || 0;
    acc[cat] = (acc[cat] || 0) + amount;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Batch Processing Summary</h2>
        <p style={{ opacity: 0.9 }}>Overview of your multi-invoice extraction session</p>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '12px', color: 'var(--primary)' }}>
            <FileText size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL PROCESSED</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{processedInvoices.length} / {totalInvoices}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '12px', color: 'var(--success)' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>READY FOR EXPORT</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{validInvoices.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', color: 'var(--danger)' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>NEEDS REVIEW</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{invalidInvoices.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '12px', color: 'var(--warning)' }}>
            <IndianRupee size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL AMOUNT (VALID)</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>₹{totalAmount.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ flex: 1 }}>
          <h3 className="card-title"><PieChart size={20} /> Spend by AI Category</h3>
          {Object.keys(categorySpend).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No valid invoices mapped to categories yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {Object.entries(categorySpend).map(([cat, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: `hsl(${i * 60 + 200}, 70%, 50%)` }}></div>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{cat}</span>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹{val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3 className="card-title"><AlertCircle size={20} color="var(--danger)" /> Needs Review</h3>
          {invalidInvoices.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>All processed invoices are valid! Great job.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {invalidInvoices.map((fs, i) => {
                const idx = fileStates.findIndex(f => f === fs);
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{fs.file.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{Object.keys(fs.validation.errors).length} validation errors detected</div>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => onSelectInvoice(idx)}>
                      Review & Fix
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default InvoiceSummaryDashboard;
