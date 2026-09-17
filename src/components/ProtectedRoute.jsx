import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // could be a small spinner; avoid flashing the login screen
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
