import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdmin, setAuth } = useAuthStore();
  const [checking, setChecking] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) return;
    apiClient
      .get<{ user: { email: string } }>('/auth/me')
      .then((res) => { setAuth(res.data.user.email, true); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
