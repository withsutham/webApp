import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/authApi'

const getErrorMessage = (error) =>
  error.response?.data?.error ?? 'Unable to register. Check the server and try again.'

export default function Register() {
  const [form, setForm] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.userName.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError('Complete every field.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const result = await authApi.register({
        userName: form.userName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      navigate('/login', {
        replace: true,
        state: { message: result.message ?? 'Registration successful. Please log in.' },
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="app auth-page">
      <p className="eyebrow">Create an account</p>
      <h1>Register</h1>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="register-userName">Username</label>
        <input
          id="register-userName"
          name="userName"
          value={form.userName}
          onChange={handleChange}
          autoComplete="username"
          maxLength={50}
          required
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          maxLength={191}
          required
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="register-confirmPassword">Confirm password</label>
        <input
          id="register-confirmPassword"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button className="add-button" type="submit" disabled={saving}>
          {saving ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="auth-prompt">Already registered? <Link to="/login">Login</Link></p>
    </section>
  )
}
