import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined, CameraOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';

const { Title } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const [form] = Form.useForm<LoginForm>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth, isAuthenticated } = useAuthStore();
  const { config } = useSiteConfigStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/admin', { replace: true });
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ token: string; email: string }>('/auth/login', values);
      setAuth(res.data.token, res.data.email);
      navigate('/admin', { replace: true });
    } catch {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

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
      <Card style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {config.logo_url ? (
            <img src={config.logo_url} alt="logo" style={{ height: 56, marginBottom: 12 }} />
          ) : (
            <CameraOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 12, display: 'block' }} />
          )}
          <Title level={3} style={{ margin: 0 }}>
            {config.site_name} — Admin
          </Title>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email requis' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Mot de passe requis' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Se connecter
          </Button>
        </Form>
      </Card>
    </div>
  );
}
