import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthForm from './App.tsx';
import Home from './Home';
import "./style.css";
import AdminDashboard from './AdminDash';
import CaissierHome from './CaisseDash';     // Importé ici
import RedacteurHome from './Redacteur';      // Importé ici

// Garde de route par rôle
function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const role = (user?.poste || '').toLowerCase();

  if (!token) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
    if (role === 'administrateur') return <Navigate to="/admin" replace />;
    if (role === 'caissier') return <Navigate to="/caissier" replace />;
    if (role === 'opérateur de saisie') return <Navigate to="/redacteur" replace />;
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<AuthForm />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['administrateur']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/caissier"
        element={
          <ProtectedRoute allowedRoles={['caissier']}>
            <CaissierHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/redacteur"
        element={
          <ProtectedRoute allowedRoles={['opérateur de saisie', 'rédacteur']}>
            <RedacteurHome />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}