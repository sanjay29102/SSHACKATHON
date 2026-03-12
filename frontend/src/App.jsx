import React from 'react';
import AppRoutes from './routes';
import './styles/main.css';

function App() {
  return (
    <div className="App">
      <header>
        <div className="container" style={{ padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>AI Invoice OCR Extraction System</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>
            <div className="status-pulse"></div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#FFFFFF' }}>Secure Processor Active</span>
          </div>
        </div>
      </header>

      <main>
        <AppRoutes />
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        borderTop: '1px solid var(--border-light)',
        marginTop: '4rem',
        background: '#FFFFFF'
      }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🔒 AES-256 Data Encryption</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🛡️ GDPR Compliant</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🔑 Secure API Access</span>
        </div>
        <p style={{ fontWeight: '500' }}>© 2026 AI Invoice OCR System - Enterprise Dashboard</p>
      </footer>
    </div>
  );
}

export default App;
