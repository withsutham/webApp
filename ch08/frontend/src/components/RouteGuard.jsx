import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function RouteGuard({ guestOnly = false, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="status">Checking your session...</p>
  }
  if (guestOnly && user) {
    return <Navigate to="/" replace />
  }
  if (!guestOnly && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
