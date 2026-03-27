import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './pages/energy/App.jsx'
import AlarmApp from './pages/alarm/AlarmApp.jsx'
import MobileApp from './pages/alarm/MobileApp.jsx'
import NavPage from './pages/nav/NavPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<App />} />
        <Route path="/alarm"  element={<AlarmApp />} />
        <Route path="/nav"    element={<NavPage />} />
        <Route path="/mobile" element={<MobileApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
