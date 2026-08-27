import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(30,41,59,0.9)',
                color: '#E2E8F0',
                border: '1px solid rgba(148,163,184,0.15)',
                backdropFilter: 'blur(8px)',
              },
              success: { iconTheme: { primary: '#06B6D4', secondary: '#0B1120' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#0B1120' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
