import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HalftoneBackground from "./components/HalftoneBackground";
import CustomCursor from "./components/CustomCursor";

// Route-level splitting keeps the public landing and auth screens small and
// avoids shipping the whole workspace bundle before a session exists.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));

function SessionLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className="app-loading-mark" aria-hidden="true" />
      <span>Restoring your session…</span>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className="app-loading-mark" aria-hidden="true" />
      <span>Loading SCRM…</span>
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SessionLoading />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Sleek Custom Dynamic Expanding Cursor */}
        <CustomCursor />

        {/* Interactive Halftone Background Canvas Engine */}
        <HalftoneBackground />

        {/* UI Content Layer */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public Landing Page at '/' for unauthenticated visitors */}
              <Route path="/" element={<LandingPage />} />

              {/* Authenticated workspace. Section and settings tab are URL-driven. */}
              <Route
                path="/app/:section?/:tab?"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Authentication Routes - Protected from already authenticated users */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
