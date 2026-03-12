import React, { useState } from 'react';
import { FileSearch, Maximize2, X, FileText, Image } from 'lucide-react';

const InvoicePreview = ({ file, isEnhanced }) => {
  const [expanded, setExpanded] = useState(false);
  const isImage = file && file.type.startsWith('image/');
  const isPDF = file && file.type === 'application/pdf';
  const fileURL = file ? URL.createObjectURL(file) : null;

  // CSS Filter for AI Enhancement - Tuned for Document Text Readability
  // Grayscale removes color noise, high contrast makes text jet-black and background white
  const enhancementStyle = isEnhanced 
    ? { filter: 'grayscale(100%) contrast(1.8) brightness(1.15)', transition: 'all 0.3s ease' } 
    : { filter: 'none', transition: 'all 0.3s ease' };

  return (
    <>
      {/* ── Main Card ── */}
      <div className="card" style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '0.4rem', borderRadius: '8px' }}>
              <FileSearch size={16} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1F2937' }}>Invoice Preview</span>
          </div>
          {file && (
            <button
              onClick={() => setExpanded(true)}
              title="Expand"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
            >
              <Maximize2 size={13} /> Expand
            </button>
          )}
        </div>

        {/* Preview Area */}
        <div style={{
          background: '#F8FAFF',
          borderRadius: '10px',
          border: '1px solid #E0E7FF',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {file ? (
            isImage ? (
              <img
                src={fileURL}
                alt="Invoice"
                style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '340px', display: 'block', ...enhancementStyle }}
              />
            ) : isPDF ? (
              <iframe
                src={fileURL}
                title="Invoice PDF"
                style={{ width: '100%', height: '340px', border: 'none', ...enhancementStyle }}
              />
            ) : (
              /* Generic file placeholder */
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <FileText size={26} color="#6366F1" />
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1F2937', marginBottom: '0.25rem' }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Preview not available for this file type</div>
              </div>
            )
          ) : (
            /* Empty state */
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Image size={28} color="#6366F1" strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#374151', marginBottom: '0.35rem' }}>Invoice will appear here</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Upload a file to preview it</div>
              {/* Animated skeleton lines */}
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                {[80, 65, 75, 50, 70].map((w, i) => (
                  <div key={i} style={{
                    height: '8px', borderRadius: '4px',
                    width: `${w}%`,
                    background: 'linear-gradient(90deg, #E0E7FF 0%, #C7D2FE 50%, #E0E7FF 100%)',
                    backgroundSize: '200% 100%',
                    animation: `shimmer 1.5s infinite ${i * 0.15}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File info strip */}
        {file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
            <div style={{ padding: '0.3rem', background: '#EEF2FF', borderRadius: '6px' }}>
              {isImage ? <Image size={13} color="#6366F1" /> : <FileText size={13} color="#6366F1" />}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <span style={{ fontSize: '0.7rem', color: '#9CA3AF', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
          </div>
        )}
      </div>

      {/* ── Expanded Modal ── */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{file?.name}</span>
              <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
              {isImage && <img src={fileURL} alt="Invoice" style={{ width: '100%', display: 'block' }} />}
              {isPDF && <iframe src={fileURL} title="Invoice PDF" style={{ width: '100%', height: '80vh', border: 'none' }} />}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default InvoicePreview;
