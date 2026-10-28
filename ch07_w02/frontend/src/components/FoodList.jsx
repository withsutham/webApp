const formatPrice = (price) => Number(price).toFixed(2)

function FoodList({ menus, loading, canEdit, onEdit, onDelete }) {
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
          </article>
        ))}
      </div>
    </section>
  )
}

export default FoodList
