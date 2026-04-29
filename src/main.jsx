import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './pages/energy/App.jsx'
import AlarmApp from './pages/alarm/AlarmApp.jsx'
import MobileApp from './pages/alarm/MobileApp.jsx'
import NavPage from './pages/nav/NavPage.jsx'
import PortfolioPage from './Pages/portfolio/PortfolioPage.jsx'
import './index.css'

const isPortfolioOnly = import.meta.env.VITE_PORTFOLIO_ONLY === 'true'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {isPortfolioOnly ? (
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/"       element={<App />} />
          <Route path="/alarm"  element={<AlarmApp />} />
          <Route path="/nav"    element={<NavPage />} />
          <Route path="/mobile" element={<MobileApp />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      )}
    </BrowserRouter>
  </React.StrictMode>,
)
