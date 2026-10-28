import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function MainLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="site-brand" to="/">Food Menu</Link>
        <div className="site-links">
          <Link to="/">Home</Link>
          <Link to="/menu">Menu</Link>
          {!loading && (user ? (
            <>
              {user.role === 'admin' && <Link to="/admin/users">Users</Link>}
              <span className="nav-user">{user.userName}</span>
              <button className="nav-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ))}
        </div>
      </nav>
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}
