import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
//import './index.css'

import { SnackbarProvider } from './Components/snackbar/AtlasSnackbar';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SnackbarProvider>
  <App />
</SnackbarProvider>
  </React.StrictMode>,
)

// Register service worker for production builds
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
