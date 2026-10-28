import { Link, Route, Routes } from 'react-router-dom'
import RouteGuard from '../components/RouteGuard'
import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import Login from '../pages/Login'
import MenuPage from '../pages/MenuPage'
import Register from '../pages/Register'
import UserManagement from '../pages/UserManagement'

function NotFoundPage() {
  return (
    <section className="app">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="lead">The page you are looking for does not exist.</p>
      <Link className="link-button" to="/">
        Back home
      </Link>
    </section>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route element={<RouteGuard guestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route element={<RouteGuard role="admin" />}>
          <Route path="admin/users" element={<UserManagement />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
