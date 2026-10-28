import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { menuApi } from '../services/menuApi'
import { ratingApi } from '../services/ratingApi'
import { typeApi } from '../services/typeApi'
import FoodForm from './FoodForm'
import FoodList from './FoodList'

const POLL_INTERVAL = 5000

const describeError = (error) =>
  error.response?.data?.error ??
  'Request failed. Check that the backend is running on port 5000.'

function FoodContainer() {
  const { user } = useAuth()
  const [menus, setMenus] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingMenu, setEditingMenu] = useState(null)
  const loadMenusRef = useRef(null)
  const dataVersionRef = useRef(0)
  const isAdmin = user?.role === 'admin'
  const canRate = user?.role === 'user'

  useEffect(() => {
    let active = true
    let requestInProgress = false
    let refreshQueued = false

    const loadMenus = async (force = false) => {
      if (requestInProgress) {
        if (force) refreshQueued = true
        return
      }

      requestInProgress = true
      const version = dataVersionRef.current
      try {
        const menuList = await menuApi.getAll()
        if (active && version === dataVersionRef.current) {
          setMenus(menuList)
          setError('')
        }
      } catch (requestError) {
        if (active && version === dataVersionRef.current) {
          setError(describeError(requestError))
        }
      } finally {
        requestInProgress = false
        if (active) setLoading(false)
        if (active && refreshQueued) {
          refreshQueued = false
          void loadMenus()
        }
      }
    }

    loadMenusRef.current = loadMenus
    void loadMenus()
    const intervalId = window.setInterval(() => void loadMenus(), POLL_INTERVAL)

    return () => {
      active = false
      window.clearInterval(intervalId)
      loadMenusRef.current = null
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!isAdmin) {
      return () => {
        active = false
      }
    }

    typeApi.getAll()
      .then((typeList) => {
        if (active) setTypes(typeList)
      })
      .catch((requestError) => {
        if (active) setError(describeError(requestError))
      })

    return () => {
      active = false
    }
  }, [isAdmin])

  const saveMenu = async (values) => {
    setError('')
    try {
      if (editingMenu) {
        await menuApi.update(editingMenu.menuId, values)
        setEditingMenu(null)
      } else {
        await menuApi.create(values)
      }
      dataVersionRef.current += 1
      await loadMenusRef.current?.(true)
      return true
    } catch (requestError) {
      setError(describeError(requestError))
      return false
    }
  }

  const deleteMenu = async (menuId) => {
    setError('')
    try {
      await menuApi.delete(menuId)
      dataVersionRef.current += 1
      setMenus((current) => current.filter((menu) => menu.menuId !== menuId))
      if (editingMenu?.menuId === menuId) setEditingMenu(null)
      await loadMenusRef.current?.(true)
    } catch (requestError) {
      setError(describeError(requestError))
    }
  }

  const saveRating = async (menuId, score, currentRating) => {
    setError('')
    try {
      const result = currentRating === null
        ? await ratingApi.create(menuId, score)
        : await ratingApi.update(menuId, score)
      dataVersionRef.current += 1
      setMenus((current) => current.map((menu) =>
        menu.menuId === menuId ? { ...menu, ...result.summary } : menu,
      ))
      await loadMenusRef.current?.(true)
      return true
    } catch (requestError) {
      setError(describeError(requestError))
      return false
    }
  }

  return (
    <section className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Food menu</p>
          <h1>Menu Manager</h1>
        </div>
        <span className="role-label">
          {user ? `${user.userName} · ${user.role}` : 'Guest'}
        </span>
      </header>

      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <FoodList
        menus={menus}
        loading={loading}
        canEdit={isAdmin}
        canRate={canRate}
        onEdit={setEditingMenu}
        onDelete={deleteMenu}
        onRate={saveRating}
      />

      {isAdmin && (
        <FoodForm
          key={editingMenu ? editingMenu.menuId : 'new'}
          types={types}
          editingMenu={editingMenu}
          onSave={saveMenu}
          onCancel={() => setEditingMenu(null)}
        />
      )}
    </section>
  )
}

export default FoodContainer
