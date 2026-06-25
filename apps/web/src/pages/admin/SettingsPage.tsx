import {
  Card,
  Form,
  Input,
  Button,
  ColorPicker,
  Upload,
  Typography,
  message,
  Divider,
  Row,
  Col,
  Alert,
  Space,
} from 'antd';
import { UploadOutlined, SaveOutlined, LockOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { Color } from 'antd/es/color-picker';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import type { SiteConfig } from '../../store/siteConfigStore';

const { Title } = Typography;

interface SiteForm {
  site_name: string;
  site_description: string;
  hero_title: string;
  hero_subtitle: string;
  contact_email: string;
  footer_text: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function SettingsPage() {
  const [siteForm] = Form.useForm<SiteForm>();
  const [passwordForm] = Form.useForm<PasswordForm>();
  const [msg, contextHolder] = message.useMessage();
  const { config, setConfig } = useSiteConfigStore();
  const [primaryColor, setPrimaryColor] = useState(config.primary_color || '#1677ff');
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState(config.logo_url || '');

  useEffect(() => {
    siteForm.setFieldsValue({
      site_name: config.site_name,
      site_description: config.site_description,
      hero_title: config.hero_title,
      hero_subtitle: config.hero_subtitle,
      contact_email: config.contact_email,
      footer_text: config.footer_text,
    });
    setPrimaryColor(config.primary_color || '#1677ff');
    setLogoUrl(config.logo_url || '');
  }, [config, siteForm]);

  const saveConfig = async (values: SiteForm) => {
    setSavingConfig(true);
    try {
      const res = await apiClient.put<SiteConfig>('/config', {
        ...values,
        primary_color: primaryColor,
      });
      setConfig(res.data);
      document.title = res.data.site_name;
      msg.success('Paramètres sauvegardés');
    } catch {
      msg.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingConfig(false);
    }
  };

  const uploadLogo = async (options: UploadRequestOption) => {
    const formData = new FormData();
    formData.append('file', options.file as File);
    try {
      const res = await apiClient.post<{ logo_url: string }>('/config/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      options.onSuccess?.({});
      setLogoUrl(res.data.logo_url);
      setConfig({ ...config, logo_url: res.data.logo_url });
      msg.success('Logo mis à jour');
    } catch {
      options.onError?.(new Error('Upload failed'));
      msg.error('Erreur lors de l\'upload du logo');
    }
  };

  const savePassword = async (values: PasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      msg.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      msg.success('Mot de passe modifié');
      passwordForm.resetFields();
    } catch {
      msg.error('Mot de passe actuel incorrect');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {contextHolder}

      {/* Site config */}
      <Card title={<Title level={4} style={{ margin: 0 }}>Apparence & contenu</Title>} style={{ marginBottom: 24 }}>
        <Form form={siteForm} layout="vertical" onFinish={saveConfig}>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item label="Logo du site">
                <Space align="center">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="logo"
                      style={{ height: 48, objectFit: 'contain', border: '1px solid #f0f0f0', borderRadius: 4, padding: 4 }}
                    />
                  )}
                  <Upload accept="image/*" showUploadList={false} customRequest={uploadLogo}>
                    <Button icon={<UploadOutlined />}>Changer le logo</Button>
                  </Upload>
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="site_name" label="Nom du site" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contact_email" label="Email de contact">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="site_description" label="Description du site">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Page d'accueil</Divider>

          <Form.Item name="hero_title" label="Titre hero">
            <Input />
          </Form.Item>
          <Form.Item name="hero_subtitle" label="Sous-titre hero">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="footer_text" label="Texte du pied de page">
            <Input />
          </Form.Item>

          <Divider>Couleurs</Divider>

          <Form.Item label="Couleur principale">
            <ColorPicker
              value={primaryColor}
              onChange={(color: Color) => setPrimaryColor(color.toHexString())}
              showText
              format="hex"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingConfig}>
            Sauvegarder
          </Button>
        </Form>
      </Card>

      {/* Change password */}
      <Card title={<Title level={4} style={{ margin: 0 }}>Sécurité</Title>}>
        <Alert
          type="info"
          message="Changez votre mot de passe administrateur"
          style={{ marginBottom: 24 }}
          showIcon
        />
        <Form form={passwordForm} layout="vertical" onFinish={savePassword} style={{ maxWidth: 400 }}>
          <Form.Item
            name="currentPassword"
            label="Mot de passe actuel"
            rules={[{ required: true, message: 'Requis' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Nouveau mot de passe"
            rules={[{ required: true, min: 6, message: 'Minimum 6 caractères' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            rules={[{ required: true, message: 'Requis' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingPassword}>
            Modifier le mot de passe
          </Button>
        </Form>
      </Card>
    </div>
  );
}
