import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProcessingStatus from '../components/ProcessingStatus';
import InvoicePreview from '../components/InvoicePreview';
import ExtractedData from '../components/ExtractedData';
import ItemsTable from '../components/ItemsTable';
import ConfidenceScore from '../components/ConfidenceScore';
import JsonViewer from '../components/JsonViewer';
import ExportButtons from '../components/ExportButtons';
import InvoiceSummaryDashboard from '../components/InvoiceSummaryDashboard';
import { apiService, mockData } from '../services/apiService';
import { validateInvoiceData } from '../utils/validationEngine';
import { autoCorrectInvoice } from '../utils/aiCorrector';
import { ArrowLeft, ShieldCheck, AlertCircle, CheckCircle, Sparkles, ChevronLeft, ChevronRight, Check, LayoutDashboard } from 'lucide-react';


const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const files = location.state?.files || (location.state?.file ? [location.state?.file] : []);

  // State array to manage multiple files
  const [fileStates, setFileStates] = useState(files.map((file) => ({
    file,
    isProcessed: false,
    isProcessing: false,
    currentStep: 1,
    data: JSON.parse(JSON.stringify(mockData)),
    validation: { isValid: true, errors: {}, warnings: [] }
  })));

  const [currentIndex, setCurrentIndex] = useState(files.length > 1 ? -1 : 0); // -1 = Dashboard View
  const currentState = currentIndex >= 0 ? fileStates[currentIndex] : null;

  useEffect(() => {
    if (files.length === 0) { navigate('/'); return; }

    const process = async () => {
      if (!currentState || currentState.isProcessed || currentState.isProcessing) return;

      const updateState = (updates) => {
        setFileStates(prev => prev.map((fs, i) => i === currentIndex ? { ...fs, ...updates } : fs));
      };

      updateState({ isProcessing: true, currentStep: 2 });
      await new Promise(r => setTimeout(r, 600));
      updateState({ currentStep: 3 });
      await new Promise(r => setTimeout(r, 800));
      updateState({ currentStep: 4 });

      const result = await apiService.processInvoice(currentState.file);
      const newData = JSON.parse(JSON.stringify(result.data));

      // Make multi-invoice data distinct for testing
      if (currentIndex > 0) {
        newData.invoice.invoice_number = `INV-2024-00${currentIndex + 1}`;
      }

      updateState({
        data: newData,
        currentStep: 5,
        isProcessing: false,
        isProcessed: true
      });
    };

    if (currentIndex >= 0 && !currentState?.isProcessed && !currentState?.isProcessing) {
      process();
    } else if (currentIndex === -1 && fileStates.some(f => !f.isProcessed && !f.isProcessing)) {
      // In dashboard mode, we could process them sequentially in the background
      // Or just wait until they navigate to them.
    }
  }, [currentIndex, files, navigate, currentState]);

  // Run validation whenever data updates
  useEffect(() => {
    if (currentState && currentState.isProcessed && !currentState.isProcessing) {
      const v = validateInvoiceData(currentState.data);
      if (JSON.stringify(v) !== JSON.stringify(currentState.validation)) {
        setFileStates(prev => prev.map((fs, i) => i === currentIndex ? { ...fs, validation: v } : fs));
      }
    }
  }, [currentState?.data, currentIndex, currentState?.isProcessed, currentState?.isProcessing, currentState?.validation]);

  const handleAutoCorrect = () => {
    const { correctedData, count } = autoCorrectInvoice(currentState.data);
    if (count > 0) {
      handleDataChange(correctedData);
      alert(`AI Magic applied! Fixed ${count} inconsistencies.`);
    } else {
      alert("No obvious corrections needed. Data already logically sound!");
    }
  };

  const handleDataChange = (newData) => {
    const sub_total = newData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tax_total = (parseFloat(newData.tax?.cgst) || 0) + (parseFloat(newData.tax?.sgst) || 0) + (parseFloat(newData.tax?.igst) || 0);
    const grand_total = sub_total + tax_total;

    const updatedData = {
      ...newData,
      totals: {
        ...newData.totals,
        sub_total,
        tax_total,
        grand_total
      }
    };

    setFileStates(prev => prev.map((fs, i) => i === currentIndex ? { ...fs, data: updatedData } : fs));
  };

  const renderContent = () => {
    if (currentIndex === -1) {
      return <InvoiceSummaryDashboard fileStates={fileStates} onSelectInvoice={setCurrentIndex} />;
    }

    if (!currentState) return null;

    const { isProcessing, isProcessed, currentStep, data, validation, file } = currentState;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>

        {/* ── Processing Pipeline ── */}
        <div className="animate-fade-in">
          <ProcessingStatus currentStep={currentStep} />
        </div>

        {/* ── Validation Banner ── */}
        {!isProcessing && isProcessed && (
          <div className="animate-fade-in" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            background: validation.isValid ? '#F0FDF4' : '#FFF8F8',
            border: `1.5px solid ${validation.isValid ? '#BBF7D0' : '#FECACA'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {validation.isValid
                ? <CheckCircle color="#16A34A" size={22} />
                : <AlertCircle color="#DC2626" size={22} />
              }
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: validation.isValid ? '#15803D' : '#B91C1C' }}>
                  {validation.isValid ? 'Invoice Validated Successfully' : `${Object.keys(validation.errors).length} field(s) need correction`}
                </div>
                <div style={{ marginTop: '2px' }}>
                  {validation.warnings.length > 0 ? (
                    validation.warnings.map((w, i) => (
                      <p key={i} style={{ margin: 0, fontSize: '0.78rem', color: 'var(--warning)', fontWeight: '600' }}>⚠ {w}</p>
                    ))
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: validation.isValid ? '#16A34A' : '#9CA3AF' }}>
                      {validation.isValid ? 'All mandatory rules passed.' : 'Fix highlighted fields to enable export.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {(!validation.isValid || validation.warnings.length > 0) && (
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', gap: '0.4rem', background: 'linear-gradient(135deg, #06B6D4, #2563EB)' }}
                  onClick={handleAutoCorrect}
                >
                  <Sparkles size={14} /> AI Auto-Correct
                </button>
              )}
              <span style={{
                background: validation.isValid ? '#DCFCE7' : '#FEE2E2',
                color: validation.isValid ? '#15803D' : '#B91C1C',
                fontWeight: '800', fontSize: '0.78rem',
                padding: '0.3rem 0.9rem', borderRadius: '50px',
                border: `1px solid ${validation.isValid ? '#BBF7D0' : '#FECACA'}`
              }}>
                {validation.isValid ? '✓ Ready for Export' : '⚠ Needs Review'}
              </span>
            </div>
          </div>
        )}

        {/* ── Two-Column: Invoice Preview + Extracted Data ── */}
        <div className="animate-fade-in" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          gap: '0.75rem',
          alignItems: 'start',
        }}>
          {/* Left: Invoice Preview — sticky so it doesn't leave a gap */}
          <div style={{ position: 'sticky', top: '5rem', alignSelf: 'start' }}>
            <InvoicePreview file={file} />
          </div>

          {/* Right: Extracted Data & Confidence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isProcessing ? (
              <div className="card" style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--primary)' }}>⚙️</div>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>AI is reading <strong>{file.name}</strong>…</p>
                </div>
              </div>
            ) : (
              <>
                <ExtractedData data={data} onChange={handleDataChange} errors={validation.errors} />
                <ConfidenceScore scores={data.confidence} />
              </>
            )}
          </div>
        </div>

        {/* ── Items Table + Export (shown only after processing) ── */}
        {!isProcessing && isProcessed && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animationDelay: '0.1s' }}>

            <ItemsTable
              items={data.items}
              onItemsChange={(items) => handleDataChange({ ...data, items })}
              totals={data.totals}
              errors={validation.errors}
            />

            {/* Bottom row: JSON Viewer + Export */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'flex-start' }}>
              <JsonViewer data={data} />

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Export Card Header */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '0.45rem', borderRadius: '9px' }}>
                      <CheckCircle size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Export Options</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '2.25rem' }}>
                    {validation.isValid
                      ? 'Invoice validated — download your structured data below.'
                      : 'Fix all red-highlighted errors to enable export.'}
                  </p>
                </div>
                <ExportButtons data={data} disabled={!validation.isValid} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '2rem', maxWidth: '1400px' }}>

      {/* ── Page Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          className="btn btn-outline"
          style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem', gap: '0.45rem' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back to Upload
        </button>

        {/* Page title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '50px', padding: '0.3rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#2563EB', letterSpacing: '0.05em' }}>
            ✦ AI EXTRACTION RESULT
          </div>
        </div>

        {/* Right spacer or batch pill */}
        <div style={{ minWidth: '140px', display: 'flex', justifyContent: 'flex-end' }}>
          {files.length > 1 && (
            <span style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: '700', fontSize: '0.8rem', padding: '0.35rem 0.9rem', borderRadius: '50px', border: '1px solid #BFDBFE' }}>
              Batch · {files.length} invoices
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* ── Sidebar (Multi-Invoice) ── */}
        {files.length > 1 && (
          <div className="card" style={{ width: '260px', flexShrink: 0, padding: '1.25rem', position: 'sticky', top: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Batch Queue</span>
              <span style={{ background: '#2563EB', color: '#fff', padding: '2px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800' }}>{files.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentIndex(-1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 0.85rem', borderRadius: '10px',
                  border: `1.5px solid ${currentIndex === -1 ? '#2563EB' : '#E5E7EB'}`,
                  background: currentIndex === -1 ? '#EFF6FF' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem',
                  color: currentIndex === -1 ? '#2563EB' : '#374151',
                }}
              >
                <LayoutDashboard size={16} /> Dashboard Overview
              </button>

              {fileStates.map((fs, idx) => {
                const isActive = idx === currentIndex;
                const statusColor = fs.isProcessing ? '#2563EB' : (fs.isProcessed ? (fs.validation.isValid ? '#16A34A' : '#DC2626') : '#9CA3AF');
                const statusIcon = fs.isProcessing
                  ? <div className="animate-spin" style={{ fontSize: '13px' }}>⚙️</div>
                  : (fs.isProcessed ? (fs.validation.isValid ? <CheckCircle size={14} /> : <AlertCircle size={14} />) : <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px dashed #9CA3AF' }} />);

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 0.85rem',
                      borderRadius: '10px', border: `1.5px solid ${isActive ? '#2563EB' : '#E5E7EB'}`,
                      background: isActive ? '#EFF6FF' : '#FAFAFA',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ color: statusColor, flexShrink: 0 }}>{statusIcon}</div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: isActive ? '700' : '600', color: isActive ? '#2563EB' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fs.file.name}</div>
                      <div style={{ fontSize: '0.68rem', color: statusColor, fontWeight: '700' }}>
                        {fs.isProcessing ? 'Processing…' : (fs.isProcessed ? (fs.validation.isValid ? 'Ready to Export' : `${Object.keys(fs.validation.errors).length} Errors`) : 'Pending')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;

