import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <ToastProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>,
)
