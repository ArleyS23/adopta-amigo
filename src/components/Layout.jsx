import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAVBAR */}
      <header className="navbar">
        <nav className="container h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">🐶 Adopta un amigo</Link>
          <div className="flex items-center gap-2">
            <NavLink to="/" className="btn-ghost">Mascotas</NavLink>
            <NavLink to="/new" className="btn-ghost">Publicar</NavLink>
            {user && <NavLink to="/me" className="btn-ghost">Mi espacio</NavLink>}
            {!user ? (
              <>
                <NavLink to="/login" className="btn-ghost">Login</NavLink>
                <NavLink to="/register" className="btn-primary">Registrar</NavLink>
              </>
            ) : (
              <button onClick={logout} className="btn-ghost">Salir</button>
            )}
          </div>
        </nav>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>

      {/* FOOTER */}
      <footer className="border-t bg-white/80">
        <div className="container py-6 text-sm text-gray-600 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
          <p>© {new Date().getFullYear()} Adopta un amigo</p>
          <p>Hecho con ♥ y colores pastel</p>
        </div>
      </footer>
    </div>
  );
}
