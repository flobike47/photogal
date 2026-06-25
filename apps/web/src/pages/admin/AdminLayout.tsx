import { Layout, Menu, Typography, Button, Badge, Space, Avatar } from 'antd';
import {
  PictureOutlined,
  SettingOutlined,
  MessageOutlined,
  LogoutOutlined,
  CameraOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { apiClient } from '../../api/client';

const { Sider, Header, Content } = Layout;

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, email } = useAuthStore();
  const { config } = useSiteConfigStore();

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => apiClient.get<{ count: number }>('/contact/unread-count').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const selectedKey = (() => {
    if (location.pathname.startsWith('/admin/albums')) return 'albums';
    if (location.pathname.startsWith('/admin/messages')) return 'messages';
    if (location.pathname.startsWith('/admin/settings')) return 'settings';
    return 'albums';
  })();

  const menuItems = [
    {
      key: 'albums',
      icon: <PictureOutlined />,
      label: <Link to="/admin/albums">Albums</Link>,
    },
    {
      key: 'messages',
      icon: (
        <Badge count={unreadData?.count ?? 0} size="small" offset={[4, 0]}>
          <MessageOutlined />
        </Badge>
      ),
      label: <Link to="/admin/messages">Messages</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/admin/settings">Paramètres</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={0} theme="dark" width={220}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {config.logo_url ? (
            <img src={config.logo_url} alt="logo" style={{ height: 32, objectFit: 'contain' }} />
          ) : (
            <CameraOutlined style={{ fontSize: 24, color: '#fff' }} />
          )}
          <Typography.Text strong style={{ color: '#fff', fontSize: 14 }}>
            {config.site_name}
          </Typography.Text>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.12)',
          }}
        >
          <Link to="/" style={{ color: '#666', fontSize: 13 }}>
            <HomeOutlined /> Voir le site
          </Link>
          <Space>
            <Avatar size="small" style={{ background: '#1677ff' }}>
              {email?.[0]?.toUpperCase()}
            </Avatar>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>{email}</Typography.Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} size="small">
              Déconnexion
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
