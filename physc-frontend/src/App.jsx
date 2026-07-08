import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { usePhysicsWorker } from './hooks/usePhysicsWorker';
import { useEditorStore }   from './store/editorStore';

import LandingPage   from './pages/LandingPage';
import BuilderPage   from './pages/BuilderPage';
import SimulatorPage from './pages/SimulatorPage';
import LoginPage     from './pages/LoginPage';
import SignupPage    from './pages/SignupPage';
import GalleryPage   from './pages/GalleryPage';
import AccountPage   from './pages/AccountPage';

function AppRoutes() {
  const { api, ready, error } = usePhysicsWorker();
  const running    = useEditorStore(s => s.running);
  const setRunning = useEditorStore(s => s.setRunning);

  return (
    <Routes>
      <Route path="/"        element={<LandingPage />} />
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/signup"  element={<SignupPage />} />
      <Route path="/gallery" element={<GalleryPage />} />

      <Route path="/builder" element={
        <ProtectedRoute>
          <BuilderPage api={api} ready={ready} error={error} />
        </ProtectedRoute>
      } />

      <Route path="/simulator" element={
        <ProtectedRoute>
          <SimulatorPage api={api} ready={ready} error={error} running={running} setRunning={setRunning} />
        </ProtectedRoute>
      } />

      <Route path="/account" element={
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      } />

      <Route path="/account/:username" element={<AccountPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
