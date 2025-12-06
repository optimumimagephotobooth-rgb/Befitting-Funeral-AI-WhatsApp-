import React from 'react';
import ReactDOM from 'react-dom/client';
import FamilyPortalApp from './FamilyPortalApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('family-root') as HTMLElement).render(
  <React.StrictMode>
    <FamilyPortalApp />
  </React.StrictMode>
);

