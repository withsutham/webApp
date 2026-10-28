import { useEffect, useState } from 'react'
import { authApi } from '../services/authApi'
import { clearToken, getToken, setToken } from '../services/authStorage'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const clearExpiredSession = () => {
      setUser(null)
      setLoading(false)
    }
    const refreshUser = async () => {
      try {
        const { user: currentUser } = await authApi.me()
        if (active) setUser(currentUser)
      } catch {
        // The 401 interceptor clears an expired session.
      }
    }
    window.addEventListener('auth:expired', clearExpiredSession)
    window.addEventListener('auth:refresh', refreshUser)

    const restoreSession = async () => {
      if (!getToken()) {
        setLoading(false)
        return
      }

      try {
        const { user: currentUser } = await authApi.me()
        if (active) setUser(currentUser)
      } catch {
        clearToken()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
      window.removeEventListener('auth:expired', clearExpiredSession)
      window.removeEventListener('auth:refresh', refreshUser)
    }
  }, [])

  const login = ({ token, user: currentUser }) => {
    setToken(token)
    setUser(currentUser)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
