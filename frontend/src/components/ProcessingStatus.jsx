import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const ProcessingStatus = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'File Uploaded' },
    { id: 2, label: 'OCR Text Extraction' },
    { id: 3, label: 'AI Data Analysis' },
    { id: 4, label: 'JSON Generation' }
  ];

  return (
    <div className="card">
      <div className="pipeline-steps">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`pipeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              {isCompleted ? (
                <CheckCircle2 size={18} />
              ) : isActive ? (
                <div className="status-pulse" style={{ width: '12px', height: '12px' }}></div>
              ) : (
                <Circle size={18} style={{ color: '#E5E7EB' }} />
              )}
              <span style={{ fontWeight: isActive ? '700' : '500', fontSize: '0.9rem' }}>
                {step.label}
              </span>
              {isCompleted && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 'bold' }}>DONE</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingStatus;
