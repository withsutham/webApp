import { useEffect, useState } from 'react'
import { userApi } from '../services/userApi'
import { useAuth } from '../context/useAuth'

const getErrorMessage = (error) =>
  error.response?.data?.error ?? 'Unable to load users. Check the server and try again.'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState(null)
  const [error, setError] = useState('')
  const { user: currentUser } = useAuth()

  useEffect(() => {
    let active = true
    userApi.getAll()
      .then((userList) => {
        if (active) setUsers(userList)
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const administrators = users.filter((listedUser) => listedUser.role === 'admin')

  const handleRoleChange = async (userId, role) => {
    setError('')
    setSavingUserId(userId)
    try {
      const updatedUser = await userApi.updateRole(userId, role)
      setUsers((current) => current.map((listedUser) =>
        listedUser.userId === userId ? updatedUser : listedUser,
      ))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <section className="app user-management">
      <p className="eyebrow">Administration</p>
      <h1>User management</h1>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {loading ? (
        <p className="status" role="status">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="status">No registered users.</p>
      ) : (
        <div className="table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((listedUser) => {
                const isCurrentAdmin =
                  listedUser.userId === currentUser.userId && listedUser.role === 'admin'
                const isLastAdmin =
                  listedUser.role === 'admin' && administrators.length <= 1
                const disabled =
                  savingUserId !== null || isCurrentAdmin || isLastAdmin

                return (
                  <tr key={listedUser.userId}>
                    <td>{listedUser.userName}</td>
                    <td>{listedUser.email}</td>
                    <td>
                      <label className="visually-hidden" htmlFor={`role-${listedUser.userId}`}>
                        Role for {listedUser.userName}
                      </label>
                      <select
                        id={`role-${listedUser.userId}`}
                        value={listedUser.role}
                        disabled={disabled}
                        onChange={(event) => handleRoleChange(listedUser.userId, event.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
