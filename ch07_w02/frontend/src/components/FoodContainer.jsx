import { useEffect, useState } from 'react'
import { menuApi } from '../services/menuApi'
import { typeApi } from '../services/typeApi'
import FoodForm from './FoodForm'
import FoodList from './FoodList'

const describeError = (error) =>
  error.response?.data?.error ??
  'Request failed. Check that the backend is running on port 5000.'

function FoodContainer() {
  const [menus, setMenus] = useState([])
  const [types, setTypes] = useState([])
  const [mode, setMode] = useState(() =>
    window.localStorage.getItem('foodMode') === 'user' ? 'user' : 'admin',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingMenu, setEditingMenu] = useState(null)

  useEffect(() => {
    window.localStorage.setItem('foodMode', mode)
  }, [mode])

  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      try {
        const [menuList, typeList] = await Promise.all([
          menuApi.getAll(),
          typeApi.getAll(),
        ])
        if (!ignore) {
          setMenus(menuList)
          setTypes(typeList)
        }
      } catch (requestError) {
        if (!ignore) {
          setError(describeError(requestError))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [])

  const saveMenu = async (values) => {
    setError('')
    try {
      if (editingMenu) {
        await menuApi.update(editingMenu.menuId, values)
        setEditingMenu(null)
      } else {
        await menuApi.create(values)
      }
      setMenus(await menuApi.getAll())
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
      if (editingMenu?.menuId === menuId) {
        setEditingMenu(null)
      }
      setMenus(await menuApi.getAll())
      return true
    } catch (requestError) {
      setError(describeError(requestError))
      return false
    }
  }

  const isAdmin = mode === 'admin'

  return (
    <section className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Food menu</p>
          <h1>Menu Manager</h1>
        </div>
        <label className="mode-control" htmlFor="mode">
          Mode
          <select
            id="mode"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
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
        onEdit={setEditingMenu}
        onDelete={deleteMenu}
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
