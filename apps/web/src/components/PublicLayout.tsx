import { Layout, Menu, Typography, Space, Button } from 'antd';
import { CameraOutlined, HomeOutlined, MailOutlined } from '@ant-design/icons';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSiteConfigStore } from '../store/siteConfigStore';

const { Header, Content, Footer } = Layout;

export function PublicLayout() {
  const { config } = useSiteConfigStore();
  const location = useLocation();

  const selectedKey = location.pathname === '/contact' ? 'contact' : 'home';

  const menuItems = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/">Accueil</Link> },
    { key: 'contact', icon: <MailOutlined />, label: <Link to="/contact">Contact</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {config.logo_url ? (
            <img src={config.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <CameraOutlined style={{ fontSize: 28, color: '#fff' }} />
          )}
          <Typography.Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
            {config.site_name}
          </Typography.Title>
        </Link>

        <Space>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ background: 'transparent', border: 'none', minWidth: 200 }}
          />
          <Button type="primary" size="small">
            <Link to="/admin" style={{ color: 'inherit' }}>Admin</Link>
          </Button>
        </Space>
      </Header>

      <Content>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', background: '#001529', color: 'rgba(255,255,255,0.65)' }}>
        {config.footer_text}
      </Footer>
    </Layout>
  );
}
