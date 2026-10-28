import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="app home-page">
      <h1>Food Menu Manager</h1>
      <p className="lead">
        Browse the menu, rate your favorites, or sign in to manage menu items.
      </p>
      <Link className="link-button" to="/menu">
        View menu
      </Link>
    </section>
  )
}
