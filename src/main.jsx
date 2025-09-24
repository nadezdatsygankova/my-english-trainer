import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from "./components/ErrorBoundary";
import { HashRouter } from "react-router-dom";
import { ToastProvider } from "./components/Toast.jsx";
import './theme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <ToastProvider>
      <ErrorBoundary>
        <HashRouter>
        <App />
        </HashRouter>
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>,
)
