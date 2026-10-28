import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { authApi } from '../services/authApi'

const getErrorMessage = (error) =>
  error.response?.data?.error ?? 'Unable to log in. Check the server and try again.'

export default function Login() {
  const [form, setForm] = useState({ userName: '', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const testAccounts = import.meta.env.DEV
    ? [
        {
          role: 'User',
          userName: import.meta.env.VITE_TEST_USER_USERNAME,
          password: import.meta.env.VITE_TEST_USER_PASSWORD,
        },
        {
          role: 'Admin',
          userName: import.meta.env.VITE_TEST_ADMIN_USERNAME,
          password: import.meta.env.VITE_TEST_ADMIN_PASSWORD,
        },
      ].filter(({ userName, password }) => userName && password)
    : []
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.userName.trim() || !form.password) {
      setError('Username and password are required.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const session = await authApi.login({
        userName: form.userName.trim(),
        password: form.password,
      })
      login(session)
      const destination = location.state?.from?.pathname ?? '/'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="app auth-page">
      <p className="eyebrow">Welcome back</p>
      <h1>Login</h1>
      {successMessage && <p className="success-banner" role="status">{successMessage}</p>}
      {error && <p className="error-banner" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="login-userName">Username</label>
        <input
          id="login-userName"
          name="userName"
          value={form.userName}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <button className="add-button" type="submit" disabled={saving}>
          {saving ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="auth-prompt">Need an account? <Link to="/register">Register</Link></p>
      {testAccounts.length > 0 && (
        <aside className="test-account-panel" aria-labelledby="test-account-title">
          <h2 id="test-account-title">Test accounts</h2>
          <p className="test-account-note">Development only. Use these accounts for local testing.</p>
          <div className="test-account-list">
            {testAccounts.map(({ role, userName, password }) => (
              <section className="test-account" key={role}>
                <h3>{role}</h3>
                <dl>
                  <div>
                    <dt>Username</dt>
                    <dd><code>{userName}</code></dd>
                  </div>
                  <div>
                    <dt>Password</dt>
                    <dd><code>{password}</code></dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </aside>
      )}
    </section>
  )
}
