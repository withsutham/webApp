import { Link, Navigate, Route, Routes } from 'react-router-dom'
import MenuPage from '../pages/MenuPage'

function NotFoundPage() {
  return (
    <section className="app">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="lead">The page you are looking for does not exist.</p>
      <Link className="link-button" to="/menu">
        Back to menu
      </Link>
    </section>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/menu" replace />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
