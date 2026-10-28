import { useState } from 'react'

const emptyForm = {
  name: '',
  price: '',
  isBestSeller: false,
  typeId: '',
}

const buildForm = (menu) =>
  menu
    ? {
        name: menu.name,
        price: String(menu.price),
        isBestSeller: menu.isBestSeller,
        typeId:
          menu.typeId === null || menu.typeId === undefined
            ? ''
            : String(menu.typeId),
      }
    : emptyForm

// The parent remounts this form with a key per menu, so editing state resets.
function FoodForm({ types, editingMenu, onSave, onCancel }) {
  const [form, setForm] = useState(() => buildForm(editingMenu))
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setValidationError('Name is required.')
      return
    }

    const price = Number(form.price)
    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      setValidationError('Price must be a number of 0 or more.')
      return
    }

    setValidationError('')
    setSaving(true)
    const saved = await onSave({
      name: form.name.trim(),
      price: price,
      isBestSeller: form.isBestSeller,
      typeId: form.typeId === '' ? null : Number(form.typeId),
    })
    setSaving(false)

    if (saved && !editingMenu) {
      setForm(emptyForm)
    }
  }

  return (
    <section className="form-section">
      <h2>{editingMenu ? 'Edit food' : 'Add food'}</h2>
      <form className="food-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="menu-name">Name</label>
        <input
          id="menu-name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="Food name"
          maxLength={100}
        />

        <label htmlFor="menu-price">Price</label>
        <input
          id="menu-price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="0"
        />

        <label htmlFor="menu-type">Type</label>
        <select
          id="menu-type"
          name="typeId"
          value={form.typeId}
          onChange={handleChange}
        >
          <option value="">No type</option>
          {types.map((type) => (
            <option key={type.typeId} value={type.typeId}>
              {type.name}
            </option>
          ))}
        </select>

        <span className="form-label">Best Seller</span>
        <label className="checkbox-field">
          <input
            name="isBestSeller"
            type="checkbox"
            checked={form.isBestSeller}
            onChange={handleChange}
          />
          Show as best seller
        </label>

        {validationError && (
          <p className="form-error" role="alert">
            {validationError}
          </p>
        )}

        <div className="form-actions">
          <button className="add-button" type="submit" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingMenu
                ? 'Save changes'
                : 'Add food'}
          </button>
          {editingMenu && (
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

export default FoodForm
