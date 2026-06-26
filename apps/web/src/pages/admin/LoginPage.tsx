import { Card, Typography, Alert } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';

const { Title, Text } = Typography;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { setAuth, isAuthenticated } = useAuthStore();
  const { config } = useSiteConfigStore();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/admin', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const handleCredential = async (response: { credential: string }) => {
      setError(null);
      try {
        const res = await apiClient.post<{ email: string; isAdmin: boolean }>('/auth/google', {
          credential: response.credential,
        });
        setAuth(res.data.email, res.data.isAdmin);
        navigate('/admin', { replace: true });
      } catch {
        setError('Accès refusé. Ce compte Google n\'est pas autorisé.');
      }
    };

    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 280,
      });
    };

    if (window.google) {
      initGoogle();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', initGoogle);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [navigate, setAuth]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #001529 0%, #003366 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 340, textAlign: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          {config.logo_url ? (
            <img src={config.logo_url} alt="logo" style={{ height: 56, marginBottom: 12 }} />
          ) : (
            <CameraOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 12, display: 'block' }} />
          )}
          <Title level={3} style={{ margin: 0 }}>
            {config.site_name}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Espace administration</Text>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16, textAlign: 'left' }} />}

        {GOOGLE_CLIENT_ID ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div ref={googleBtnRef} />
          </div>
        ) : (
          <Alert type="warning" message="Google Sign-In non configuré (VITE_GOOGLE_CLIENT_ID manquant)" />
        )}
      </Card>
    </div>
  );
}
