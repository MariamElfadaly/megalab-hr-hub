import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { RosterProvider } from "./contexts/RosterContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FileTracker from "./pages/FileTracker";
import LabelGenerator from "./pages/LabelGenerator";
import LockerRoom from "./pages/LockerRoom";
import HrTimeline from "./pages/HrTimeline";

const Router = HashRouter;

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function Shell({ children }) {
  return (
    <RosterProvider>
      <AppShell>{children}</AppShell>
    </RosterProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Shell>
                    <Dashboard />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file-tracker/:employeeId?"
              element={
                <ProtectedRoute>
                  <Shell>
                    <FileTracker />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/labels/:employeeId?"
              element={
                <ProtectedRoute>
                  <Shell>
                    <LabelGenerator />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/locker-room/:employeeId?"
              element={
                <ProtectedRoute>
                  <Shell>
                    <LockerRoom />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr-timeline/:employeeId?"
              element={
                <ProtectedRoute>
                  <Shell>
                    <HrTimeline />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
