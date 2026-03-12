import React, { useState } from 'react';
import { Upload, FileJson, Building2, Calendar, FileText, CheckCircle2, TrendingUp, DollarSign, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const JsonDashboard = () => {
  const [jsonData, setJsonData] = useState(null);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.invoice || parsed.supplier || parsed.items) {
          setJsonData(parsed);
          setError('');
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].invoice) {
          // In case it's an array of invoices
          setJsonData(parsed[0]);
          setError('');
        } else {
          setError('Invalid JSON structure. The file does not appear to be output from our OCR system.');
        }
      } catch (err) {
        setError('Error parsing JSON file. Please ensure it is well-formed.');
      }
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setJsonData(null);
    setError('');
  };

  const renderAnalyticsGraph = () => {
    if (!jsonData?.items || jsonData.items.length === 0) return null;
    
    // Calculate max amount for proportional scaling
    const items = jsonData.items.map(i => ({
      name: (i.name || 'Unknown').substring(0, 15),
      amount: parseFloat(i.amount) || 0
    }));
    
    const maxVal = Math.max(...items.map(i => i.amount), 1);
    
    return (
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <TrendingUp size={18} color="#0891B2" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Analytics: Amount per Line Item</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px', paddingBottom: '24px', position: 'relative', borderBottom: '2px solid #F3F4F6', marginLeft: '2rem' }}>
          {/* Y-Axis Value labels */}
          <div style={{ position: 'absolute', left: '-3rem', top: '-10px', fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '600' }}>₹{Math.round(maxVal)}</div>
          <div style={{ position: 'absolute', left: '-3rem', bottom: '20px', fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '600' }}>₹0</div>
          
          {items.map((item, idx) => {
            const heightPct = Math.max((item.amount / maxVal) * 100, 2);
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#1F2937', marginBottom: '6px' }}>₹{Math.round(item.amount)}</span>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '3rem', 
                  height: `${heightPct}%`, 
                  background: 'linear-gradient(180deg, #06B6D4, #3B82F6)', 
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 4px 10px rgba(6, 182, 212, 0.2)',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
                <span style={{ position: 'absolute', bottom: '-24px', fontSize: '0.65rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center', fontWeight: '500' }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '1400px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
          fontSize: '0.85rem', fontWeight: '600', color: '#4B5563', textDecoration: 'none',
          padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white',
          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
        }}>
          <ArrowLeft size={16} /> Back to Scanner
        </Link>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 0.5rem 0', color: '#1F2937' }}>
            Invoice Analytics Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Upload your OCR extraction JSON to instantly generate a dashboard.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Left Side: Upload Area */}
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#EEF2FF', padding: '1rem', borderRadius: '50%', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileJson size={32} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Upload JSON Output</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Select the JSON file downloaded from the extraction system.
          </p>

          <label 
            htmlFor="json-upload" 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer' }}
          >
            <Upload size={18} />
            Browse JSON File
          </label>
          <input 
            type="file" 
            id="json-upload" 
            accept=".json,application/json" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          
          {error && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.85rem', textAlign: 'left' }}>
              {error}
            </div>
          )}

          {jsonData && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A', fontSize: '0.9rem', fontWeight: '700', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle2 size={18} /> File loaded successfully
              </div>
              <button className="btn btn-outline" onClick={clearData} style={{ width: '100%' }}>
                Clear Data
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Dashboard View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!jsonData ? (
            <div style={{ background: 'white', border: '2px dashed #E5E7EB', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', height: '100%', minHeight: '400px', color: '#9CA3AF' }}>
              <TrendingUp size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#6B7280' }}>Dashboard Empty</h3>
              <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>
                Upload a valid JSON extraction output on the left to render the visual dashboard.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Top Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Grand Total</div>
                    <div style={{ background: '#ECFEFF', color: '#0891B2', padding: '0.4rem', borderRadius: '8px' }}>
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1F2937' }}>
                    ₹{jsonData.totals?.grand_total || '0.00'}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280' }}>
                    <span>Subtotal: ₹{jsonData.totals?.sub_total || '0'}</span>
                    <span>Tax: ₹{jsonData.totals?.tax_total || '0'}</span>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Invoice Details</div>
                    <div style={{ background: '#F5F3FF', color: '#7C3AED', padding: '0.4rem', borderRadius: '8px' }}>
                      <FileText size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1F2937', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {jsonData.invoice?.invoice_number || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#6B7280' }}>
                    <Calendar size={14} /> {jsonData.invoice?.invoice_date || 'N/A'}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Supplier</div>
                    <div style={{ background: '#FFF7ED', color: '#EA580C', padding: '0.4rem', borderRadius: '8px' }}>
                      <Building2 size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1F2937', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {jsonData.supplier?.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    GSTIN: {jsonData.supplier?.gstin || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Analytics Graph */}
              {renderAnalyticsGraph()}

              {/* Items Table */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Package size={18} color="#4F46E5" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Line Items Breakdown</h3>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#F3F4F6', color: '#4B5563', borderBottom: '2px solid #E5E7EB' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Item Name</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>HSN/SAC</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '700', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '700', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData.items && jsonData.items.length > 0 ? (
                        jsonData.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                            <td style={{ padding: '1rem', fontWeight: '500', color: '#1F2937' }}>{item.name || 'Unspecified'}</td>
                            <td style={{ padding: '1rem', color: '#6B7280' }}>{item.hsn || '-'}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: '#4B5563' }}>{item.qty || '0'}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: '#4B5563' }}>₹{item.rate || '0.00'}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#1F2937' }}>₹{item.amount || '0.00'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>No items found in this invoice.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Taxes Section inside items card */}
                {(jsonData.tax?.cgst > 0 || jsonData.tax?.sgst > 0 || jsonData.tax?.igst > 0) && (
                  <div style={{ marginTop: '2rem', background: '#F9FAFB', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'flex-end', gap: '3rem' }}>
                    {jsonData.tax.cgst > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '600', marginBottom: '0.2rem' }}>CGST</div>
                        <div style={{ fontWeight: '700', color: '#1F2937' }}>₹{jsonData.tax.cgst}</div>
                      </div>
                    )}
                    {jsonData.tax.sgst > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '600', marginBottom: '0.2rem' }}>SGST</div>
                        <div style={{ fontWeight: '700', color: '#1F2937' }}>₹{jsonData.tax.sgst}</div>
                      </div>
                    )}
                    {jsonData.tax.igst > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '600', marginBottom: '0.2rem' }}>IGST</div>
                        <div style={{ fontWeight: '700', color: '#1F2937' }}>₹{jsonData.tax.igst}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JsonDashboard;
