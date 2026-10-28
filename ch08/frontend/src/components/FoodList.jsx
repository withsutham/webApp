import { useState } from 'react'

const formatPrice = (price) => Number(price).toFixed(2)

function RatingControl({ menu, onRate }) {
  const [draftScore, setDraftScore] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const score = dirty
    ? draftScore
    : menu.myRating == null
      ? ''
      : String(menu.myRating)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!score) return
    setSaving(true)
    const saved = await onRate(menu.menuId, Number(score), menu.myRating ?? null)
    if (saved) setDirty(false)
    setSaving(false)
  }

  return (
    <form className="rating-form" onSubmit={handleSubmit}>
      <label htmlFor={`rating-${menu.menuId}`}>Your rating</label>
      <select
        id={`rating-${menu.menuId}`}
        value={score}
        onChange={(event) => {
          setDraftScore(event.target.value)
          setDirty(true)
        }}
      >
        <option value="">Choose 1–5</option>
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
      <button className="secondary-button" type="submit" disabled={saving || !score}>
        {saving ? 'Saving...' : menu.myRating == null ? 'Rate' : 'Update rating'}
      </button>
    </form>
  )
}

function FoodList({ menus, loading, canEdit, canRate, onEdit, onDelete, onRate }) {
  if (loading) {
    return <p className="status">Loading menu...</p>
  }

  if (menus.length === 0) {
    return <p className="status">No menu items yet.</p>
  }

  const handleDelete = (menu) => {
    const confirmed = window.confirm(`Delete "${menu.name}" from the menu?`)
    if (confirmed) {
      onDelete(menu.menuId)
    }
  }

  return (
    <section className="food-section">
      <div className="section-heading">
        <h2>Food list</h2>
        <span>{menus.length} items</span>
      </div>
      <div className="food-list">
        {menus.map((menu) => (
          <article className="food-item" key={menu.menuId}>
            <div>
              <h3>{menu.name}</h3>
              <p className="price">Price: {formatPrice(menu.price)}</p>
              <p className="menu-type">Type: {menu.type?.name ?? '-'}</p>
              <p className="rating-summary">
                {menu.ratingCount > 0
                  ? `${Number(menu.averageRating).toFixed(1)} / 5 · ${menu.ratingCount} ratings`
                  : 'No ratings yet'}
              </p>
            </div>
            <div className="food-actions">
              <span className={menu.isBestSeller ? 'badge bestseller' : 'badge'}>
                {menu.isBestSeller ? 'BestSeller' : 'Normal'}
              </span>
              {canEdit && (
                <>
                  <button
                    className="edit-button"
                    type="button"
                    onClick={() => onEdit(menu)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => handleDelete(menu)}
                  >
                    Del
                  </button>
                </>
              )}
            </div>
            {canRate && <RatingControl menu={menu} onRate={onRate} />}
          </article>
        ))}
      </div>
    </section>
  )
}

export default FoodList
