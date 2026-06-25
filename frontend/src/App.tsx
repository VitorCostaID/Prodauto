import { Routes, Route, Navigate } from 'react-router-dom'
import SearchPage from '@/pages/SearchPage'
import PerfectProductPage from '@/pages/PerfectProductPage'
import AccountPage from '@/pages/AccountPage'
import AboutPage from '@/pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"                 element={<SearchPage />} />
      <Route path="/produto-perfeito" element={<PerfectProductPage />} />
      <Route path="/conta"            element={<AccountPage />} />
      <Route path="/sobre"            element={<AboutPage />} />
      <Route path="*"                 element={<Navigate to="/" replace />} />
    </Routes>
  )
}
