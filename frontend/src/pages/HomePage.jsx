import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadInvoice from '../components/UploadInvoice';
import { ShieldCheck, Zap, FileCheck2, Download } from 'lucide-react';

const features = [
  { icon: <Zap size={18} />, label: 'AI OCR Extraction', desc: 'Extracts supplier, dates, line items & tax in seconds' },
  { icon: <ShieldCheck size={18} />, label: 'Smart Validation', desc: 'Auto-checks totals, GST logic and mandatory fields' },
  { icon: <FileCheck2 size={18} />, label: 'Duplicate Detection', desc: 'Flags repeat invoice numbers across your session' },
  { icon: <Download size={18} />, label: 'Multi-Format Export', desc: 'Download validated data as JSON, CSV or XML' },
];

const STEPS = [
  {
    n: 1, label: 'Upload your invoice',
    desc: 'Drag & drop, paste, or select your PDF, JPG or PNG — supports batch upload of multiple invoices at once.',
  },
  {
    n: 2, label: 'AI reads & extracts',
    desc: 'Our OCR engine scans the document and pulls out supplier info, line items, GST, totals and more.',
  },
  {
    n: 3, label: 'Validate & correct',
    desc: 'Smart rules check totals, GSTIN format, mandatory fields. Use AI Auto-Correct to fix issues in one click.',
  },
  {
    n: 4, label: 'Export your data',
    desc: 'Download the validated, structured invoice data as JSON, CSV or XML — ready for your ERP or accounting tool.',
  },
];

const StepVisual = ({ step }) => {
  const panel = {
    background: 'linear-gradient(145deg, #F0F4FF, #EEF2FF)',
    borderRadius: '24px',
    border: '1px solid #E0E7FF',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    boxShadow: '0 8px 32px rgba(37,99,235,0.07)',
    minHeight: '280px',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.35s ease',
  };

  if (step === 1) return (
    <div style={panel}>
      <div style={{ width: '100%', border: '2.5px dashed #93C5FD', borderRadius: '18px', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', background: 'white' }}>
        <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #2563EB, #4F46E5)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 6px 18px rgba(37,99,235,0.3)' }}>📄</div>
        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1F2937' }}>Drop your invoice here</div>
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>or click to browse</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['PDF', 'JPG', 'PNG'].map(t => (
            <span key={t} style={{ background: '#EEF2FF', color: '#6366F1', fontSize: '0.68rem', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', border: '1px solid #C7D2FE' }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', color: '#6366F1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1' }} /> Ctrl+V to paste · Batch upload supported
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ ...panel, gap: '1rem' }}>
      <div style={{ width: '100%', background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6366F1', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366F1', letterSpacing: '0.05em' }}>AI SCANNING…</span>
        </div>
        {[
          { label: 'Supplier Name', done: true, val: 'ABC Textiles' },
          { label: 'GSTIN', done: true, val: '27AABCS1429B1ZS' },
          { label: 'Invoice Number', done: true, val: 'INV-2024-001' },
          { label: 'Grand Total', done: false, val: '' },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.55rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, background: f.done ? '#DCFCE7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: f.done ? '#15803D' : '#9CA3AF', border: f.done ? '1px solid #BBF7D0' : '1px solid #E5E7EB' }}>
              {f.done ? '✓' : '…'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: '700' }}>{f.label}</div>
              {f.done
                ? <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1F2937' }}>{f.val}</div>
                : <div style={{ height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #E0E7FF 0%, #C7D2FE 50%, #E0E7FF 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite', width: '60%', marginTop: '3px' }} />
              }
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  if (step === 3) return (
    <div style={{ ...panel }}>
      <div style={{ width: '100%', background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#9CA3AF', letterSpacing: '0.06em', marginBottom: '1rem' }}>VALIDATION CHECKS</div>
        {[
          { label: 'GSTIN format valid', pass: true },
          { label: 'Total matches line items', pass: true },
          { label: 'Invoice number present', pass: true },
          { label: 'Phone must be 10 digits', pass: false },
          { label: 'Mandatory fields filled', pass: true },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '8px', marginBottom: '0.35rem', background: c.pass ? '#F0FDF4' : '#FFF8F8', border: `1px solid ${c.pass ? '#BBF7D0' : '#FECACA'}` }}>
            <span style={{ fontSize: '0.75rem' }}>{c.pass ? '✅' : '❌'}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: c.pass ? '#15803D' : '#B91C1C' }}>{c.label}</span>
          </div>
        ))}
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem' }}>✨</span>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4F46E5' }}>AI Auto-Correct available</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...panel, gap: '1rem' }}>
      <div style={{ width: '100%', background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#9CA3AF', letterSpacing: '0.06em' }}>READY TO EXPORT</span>
          <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.62rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', border: '1px solid #BBF7D0' }}>✓ Validated</span>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#2563EB', marginBottom: '1rem' }}>₹17,315</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { fmt: 'JSON', icon: '{ }', desc: 'Structured data for APIs & ERPs', color: '#6366F1', bg: '#EEF2FF' },
            { fmt: 'CSV', icon: '⊞', desc: 'Spreadsheet-ready format', color: '#0891B2', bg: '#ECFEFF' },
            { fmt: 'XML', icon: '<>', desc: 'Legacy system compatible', color: '#7C3AED', bg: '#F5F3FF' },
          ].map(f => (
            <div key={f.fmt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: f.bg, borderRadius: '10px', border: `1px solid ${f.color}22`, cursor: 'pointer' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: '900', color: f.color, fontSize: '0.9rem', width: '22px', textAlign: 'center' }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: f.color }}>{f.fmt}</div>
                <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>{f.desc}</div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: f.color }}>↓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="animate-fade-in" style={{ marginTop: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>How it works</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>From raw invoice to structured data — in 4 simple steps.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem', alignItems: 'center' }}>
        {/* Left: dynamic visual */}
        <StepVisual step={active + 1} />
        {/* Right: steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {STEPS.map((step, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                onClick={() => setActive(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                  padding: '1rem 1.25rem', borderRadius: '14px', cursor: 'pointer',
                  background: isActive ? 'white' : 'transparent',
                  border: isActive ? '1.5px solid #C7D2FE' : '1.5px solid transparent',
                  boxShadow: isActive ? '0 4px 18px rgba(37,99,235,0.09)' : 'none',
                  transition: 'all 0.22s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#FAFBFF';
                    e.currentTarget.style.borderColor = '#E0E7FF';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: isActive ? 'linear-gradient(135deg, #2563EB, #4F46E5)' : '#F3F4F6',
                  color: isActive ? 'white' : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '900', fontSize: '1rem',
                  boxShadow: isActive ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
                  transition: 'all 0.22s ease',
                }}>
                  {step.n}
                </div>
                <div style={{ paddingTop: '0.2rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem', color: isActive ? '#1F2937' : '#6B7280', marginBottom: '0.2rem', transition: 'color 0.2s' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.81rem', color: isActive ? '#4F46E5' : '#9CA3AF', lineHeight: '1.55', fontWeight: isActive ? '500' : '400', transition: 'color 0.2s' }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  const handleUpload = (files) => {
    navigate('/result', { state: { files } });
  };

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
      
      {/* ── Hero Title ── */}
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '50px', padding: '0.35rem 1.1rem', marginBottom: '1.5rem', fontSize: '0.8rem', fontWeight: '700', color: '#2563EB', letterSpacing: '0.05em' }}>
          ✦ AI-POWERED · ENTERPRISE OCR SYSTEM
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', margin: '0 0 1.25rem 0', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
          AI Invoice OCR<br />
          <span style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Extraction System
          </span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto', lineHeight: '1.7' }}>
          Upload any invoice — scanned, photographed, or digital — and our AI extracts, validates and structures your financial data instantly.
        </p>
      </div>

      {/* ── Main Split Layout ── */}
      <div className="animate-fade-in" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '3rem',
        alignItems: 'flex-start',
        marginBottom: '5rem'
      }}>

        {/* Left: Light floating-cards illustration */}
        <div style={{
          background: 'linear-gradient(145deg, #F0F4FF, #EEF2FF)',
          borderRadius: '28px',
          minHeight: '460px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16px 48px rgba(37,99,235,0.08)',
          border: '1px solid #E0E7FF',
          padding: '2.5rem',
        }}>
          {/* Subtle light glow orbs */}
          <div style={{ position: 'absolute', top: '5%', left: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* ── Card stack ── */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px', height: '360px' }}>

            {/* Top-right card — Invoice Summary pie chart */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '200px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '18px', padding: '1rem 1.25rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>INVOICE SUMMARY</div>
              <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginBottom: '0.5rem' }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#6366F1" strokeWidth="8"
                  strokeDasharray="88 88" strokeDashoffset="22" strokeLinecap="round" transform="rotate(-90 32 32)" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#8B5CF6" strokeWidth="8"
                  strokeDasharray="44 132" strokeDashoffset="-66" strokeLinecap="round" transform="rotate(-90 32 32)" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#F59E0B" strokeWidth="8"
                  strokeDasharray="24 152" strokeDashoffset="-110" strokeLinecap="round" transform="rotate(-90 32 32)" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[{ c: '#6366F1', l: 'Goods', v: '57%' }, { c: '#8B5CF6', l: 'Services', v: '28%' }, { c: '#F59E0B', l: 'Tax', v: '15%' }].map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>{x.l}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#1F2937', fontWeight: '700' }}>{x.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top-left small card — Confidence donut */}
            <div style={{
              position: 'absolute', top: '30px', left: 0,
              width: '116px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '18px', padding: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
            }}>
              <div style={{ fontSize: '0.55rem', fontWeight: '700', color: '#9CA3AF', letterSpacing: '0.06em', textAlign: 'center' }}>CONFIDENCE</div>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="20" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle cx="26" cy="26" r="20" fill="none" stroke="url(#gradLight)" strokeWidth="6"
                  strokeDasharray="113 126" strokeDashoffset="31.5" strokeLinecap="round" transform="rotate(-90 26 26)" />
                <defs>
                  <linearGradient id="gradLight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1F2937">94%</text>
              </svg>
              <div style={{ fontSize: '0.6rem', color: '#6B7280', textAlign: 'center' }}>AI Score</div>
            </div>

            {/* Centre card — Extracted Line Items */}
            <div style={{
              position: 'absolute', top: '140px', left: '20px',
              width: '250px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '18px', padding: '1rem 1.25rem',
              boxShadow: '0 6px 24px rgba(0,0,0,0.07)',
            }}>
              <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>EXTRACTED LINE ITEMS</div>
              {[
                { name: 'Cotton Fabric', qty: '100 Mtrs', amt: '₹12,000', bg: '#EEF2FF', color: '#6366F1' },
                { name: 'Polyester Thread', qty: '50 Spools', amt: '₹2,250', bg: '#F0FDF4', color: '#16A34A' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: i === 0 ? '0.6rem' : 0, padding: '0.5rem', background: '#F9FAFB', borderRadius: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.bg, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>{item.qty}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: item.color, flexShrink: 0 }}>{item.amt}</div>
                </div>
              ))}
            </div>

            {/* Bottom-right card — Grand Total */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '220px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '18px', padding: '1rem 1.25rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', letterSpacing: '0.06em' }}>GRAND TOTAL</span>
                <span style={{ background: '#F0FDF4', color: '#16A34A', fontSize: '0.58rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', border: '1px solid #BBF7D0' }}>✓ VALID</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#2563EB', marginBottom: '0.6rem' }}>₹17,315</div>
              {/* Mini bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '28px' }}>
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '3px', background: i === 5 ? '#6366F1' : '#E0E7FF', height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Upload Box */}
        <div>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #F0F0F0' }}>
            {/* Mini before/after icon pair */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: '10px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid #E5E7EB' }}>📄</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', fontWeight: '600', color: '#9CA3AF' }}>Invoice</div>
              </div>
              <div style={{ fontSize: '1.4rem', color: '#2563EB', fontWeight: '900' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🤖</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', fontWeight: '600', color: '#9CA3AF' }}>AI Extract</div>
              </div>
              <div style={{ fontSize: '1.4rem', color: '#22C55E', fontWeight: '900' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid #BBF7D0' }}>📊</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', fontWeight: '600', color: '#9CA3AF' }}>JSON/CSV</div>
              </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#1F2937' }}>
              AI Invoice Extraction
            </h2>

            <UploadInvoice onUpload={handleUpload} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #06B6D4)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: '600' }}>
                Multiple Invoice Support — upload &amp; process up to 10 invoices at once
              </span>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #2563EB)', flexShrink: 0 }} />
            </div>


          </div>
        </div>
      </div>

      {/* ── Feature Highlights ── */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>Everything you need for invoice automation</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Built for accounting teams, built for scale.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem' }}>
              <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '0.6rem', borderRadius: '10px', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.25rem' }}>{f.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works (Interactive) ── */}
      <HowItWorks />

    </div>
  );
};

export default HomePage;


