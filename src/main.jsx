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

// Register service worker only in production builds.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (registration.waiting) {
            window.location.reload();
          }
        });
      });
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
