import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import { AppProvider } from './context/AppContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
        <OfflineBanner />
        <App />
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
)
