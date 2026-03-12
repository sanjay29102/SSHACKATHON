import React from 'react';

const JsonViewer = ({ data }) => {
  return (
    <div className="card">
      <h3 className="card-title">Formatted JSON Output</h3>
      <div className="json-viewer-container">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};

export default JsonViewer;
