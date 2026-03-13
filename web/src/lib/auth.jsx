import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export function authHeader() {
  let user;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    return {};
  }

  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  }
  return {};
}

export function PrivateRoute({ children }) {
  const location = useLocation();

  if (!localStorage.getItem('user')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const location = useLocation();
  const raw = localStorage.getItem('user');

  if (!raw) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  try {
    const user = JSON.parse(raw);
    if (user && typeof user.role === 'number' && user.role >= 10) {
      return children;
    }
  } catch {
    // ignore
  }

  return <Navigate to="/forbidden" replace />;
}

export function AuthRedirect({ children }) {
  const user = localStorage.getItem('user');

  if (user) {
    return <Navigate to="/console" replace />;
  }
  return children;
}
