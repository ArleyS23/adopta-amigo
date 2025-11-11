import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-6">Cargando…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  const needsEmail = !user.emailVerified;
  if (needsEmail && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }
  return children;
}
