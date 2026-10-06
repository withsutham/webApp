import { useEffect, useState } from 'react'
import './App.css'

const initialFoods = [
  { name: 'cake', price: 35, isBestSeller: true },
  { name: 'bread', price: 25, isBestSeller: false },
  { name: 'milk', price: 15, isBestSeller: true },
  { name: 'donut', price: 45, isBestSeller: false },
  { name: 'cookie', price: 55, isBestSeller: true },
]

const emptyForm = {
  name: '',
  price: '',
  isBestSeller: 'false',
}

function FoodContainer() {
  const [foods, setFoods] = useState(initialFoods)
  const [mode, setMode] = useState(() => {
    const savedMode = window.localStorage.getItem('foodMode')
    return savedMode === 'admin' ? 'admin' : 'user'
  })

  useEffect(() => {
    window.localStorage.setItem('foodMode', mode)
  }, [mode])

  const addItem = (item) => {
    setFoods((currentFoods) => [...currentFoods, item])
  }

  const deleteItem = (index) => {
    setFoods((currentFoods) =>
      currentFoods.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const isAdmin = mode === 'admin'

  return (
    <main className="app">
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

      <FoodList foods={foods} canDelete={isAdmin} onDelete={deleteItem} />
      {isAdmin && <FoodForm onAdd={addItem} />}
    </main>
  )
}

function FoodList({ foods, canDelete, onDelete }) {
  return (
    <section className="food-section">
      <div className="section-heading">
        <h2>Food list</h2>
        <span>{foods.length} items</span>
      </div>
      <div className="food-list">
        {foods.map((food, index) => (
          <FoodItem
            key={`${food.name}-${index}`}
            food={food}
            canDelete={canDelete}
            onDelete={() => onDelete(index)}
          />
        ))}
      </div>
    </section>
  )
}

function FoodItem({ food, canDelete, onDelete }) {
  return (
    <article className="food-item">
      <div>
        <h3>{food.name}</h3>
        <p className="price">Price: {food.price}</p>
      </div>
      <div className="food-actions">
        <span className={food.isBestSeller ? 'badge bestseller' : 'badge'}>
          {food.isBestSeller ? 'BestSeller' : 'Normal'}
        </span>
        {canDelete && (
          <button className="delete-button" type="button" onClick={onDelete}>
            Del
          </button>
        )}
      </div>
    </article>
  )
}

function FoodForm({ onAdd }) {
  const [formData, setFormData] = useState(emptyForm)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!formData.name.trim() || formData.price === '') {
      return
    }

    onAdd({
      name: formData.name.trim(),
      price: Number(formData.price),
      isBestSeller: formData.isBestSeller === 'true',
    })
    setFormData({ ...emptyForm })
  }

  return (
    <section className="form-section">
      <h2>Add food</h2>
      <form className="food-form" onSubmit={handleSubmit}>
        <label htmlFor="food-name">Name</label>
        <input
          id="food-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Food name"
        />

        <label htmlFor="food-price">Price</label>
        <input
          id="food-price"
          name="price"
          type="number"
          min="0"
          value={formData.price}
          onChange={handleChange}
          placeholder="0"
        />

        <label htmlFor="food-best-seller">Type</label>
        <select
          id="food-best-seller"
          name="isBestSeller"
          value={formData.isBestSeller}
          onChange={handleChange}
        >
          <option value="true">BestSeller</option>
          <option value="false">Normal</option>
        </select>

        <button className="add-button" type="submit">
          Add food
        </button>
      </form>
    </section>
  )
}

function App() {
  return <FoodContainer />
}

export default App
