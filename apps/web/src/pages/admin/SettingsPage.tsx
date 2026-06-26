import {
  Card,
  Tabs,
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
  Space,
  Radio,
  Avatar,
  Alert,
  Progress,
  Statistic,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  UploadOutlined,
  SaveOutlined,
  LockOutlined,
  InstagramOutlined,
  GlobalOutlined,
  PictureOutlined,
  UserOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { Color } from 'antd/es/color-picker';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import type { SiteConfig } from '../../store/siteConfigStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

const FONT_OPTIONS = [
  {
    value: 'cormorant',
    label: 'Cormorant Garamond',
    style: { fontFamily: "'Cormorant Garamond', Georgia, serif" },
    sample: 'Élégant & raffiné',
  },
  {
    value: 'playfair',
    label: 'Playfair Display',
    style: { fontFamily: "'Playfair Display', Georgia, serif" },
    sample: 'Éditorial & classique',
  },
  {
    value: 'montserrat',
    label: 'Montserrat',
    style: { fontFamily: "'Montserrat', sans-serif" },
    sample: 'Moderne & épuré',
  },
];

const fontStacks: Record<string, string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  montserrat: "'Montserrat', sans-serif",
};

function ImageUploadField({
  label,
  type,
  currentUrl,
  onSuccess,
  hint,
  aspectHint,
}: {
  label: string;
  type: 'logo' | 'hero' | 'about';
  currentUrl: string;
  onSuccess: (url: string) => void;
  hint?: string;
  aspectHint?: string;
}) {
  const [msg, ctxHolder] = message.useMessage();

  const upload = async (options: UploadRequestOption) => {
    const formData = new FormData();
    formData.append('file', options.file as File);
    try {
      const res = await apiClient.post<{ url: string }>(`/config/image/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      options.onSuccess?.({});
      onSuccess(res.data.url);
      msg.success(`${label} mise à jour`);
    } catch {
      options.onError?.(new Error('Upload failed'));
      msg.error('Erreur lors de l\'upload');
    }
  };

  return (
    <div>
      {ctxHolder}
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      {hint && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{hint}</Text>}
      <Space align="center" style={{ marginTop: 8 }}>
        {currentUrl ? (
          type === 'logo' ? (
            <img src={currentUrl} alt="preview" style={{ height: 56, maxWidth: 160, objectFit: 'contain', border: '1px solid #f0f0f0', borderRadius: 6, padding: 6, background: '#fafafa' }} />
          ) : type === 'about' ? (
            <Avatar src={currentUrl} size={72} style={{ border: '2px solid #f0f0f0' }} />
          ) : (
            <div style={{ position: 'relative', width: 160, height: 90, borderRadius: 6, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
              <img src={currentUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )
        ) : (
          <div style={{ width: type === 'hero' ? 160 : 72, height: type === 'hero' ? 90 : 72, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9' }}>
            {type === 'about' ? <UserOutlined style={{ color: '#bbb', fontSize: 24 }} /> : <PictureOutlined style={{ color: '#bbb', fontSize: 24 }} />}
          </div>
        )}
        <div>
          <Upload accept="image/*" showUploadList={false} customRequest={upload}>
            <Button icon={<UploadOutlined />} size="small">
              {currentUrl ? 'Changer' : 'Uploader'}
            </Button>
          </Upload>
          {aspectHint && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{aspectHint}</Text>}
        </div>
      </Space>
    </div>
  );
}

export function SettingsPage() {
  const [identityForm] = Form.useForm();
  const [appearanceForm] = Form.useForm();
  const [contentForm] = Form.useForm();
  const [socialForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [msg, ctxHolder] = message.useMessage();
  const { config, setConfig } = useSiteConfigStore();

  const { data: storageStats } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: () => apiClient.get<{ used_bytes: number; limit_gb: number | null }>('/config/storage').then(r => r.data),
    refetchInterval: 30_000,
  });

  const [primaryColor, setPrimaryColor] = useState(config.primary_color || '#1677ff');
  const [headingFont, setHeadingFont] = useState(config.heading_font || 'cormorant');
  const [siteTheme, setSiteTheme] = useState(config.site_theme || 'dark');
  const [logoUrl, setLogoUrl] = useState(config.logo_url || '');
  const [heroImageUrl, setHeroImageUrl] = useState(config.hero_image_url || '');
  const [aboutImageUrl, setAboutImageUrl] = useState(config.about_image_url || '');
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    identityForm.setFieldsValue({ site_name: config.site_name, site_description: config.site_description, contact_email: config.contact_email, footer_text: config.footer_text });
    appearanceForm.setFieldsValue({ heading_font: config.heading_font || 'cormorant' });
    contentForm.setFieldsValue({ hero_title: config.hero_title, hero_subtitle: config.hero_subtitle, about_title: config.about_title, about_text: config.about_text });
    socialForm.setFieldsValue({ social_instagram: config.social_instagram, social_facebook: config.social_facebook, social_pinterest: config.social_pinterest, social_website: config.social_website });
    setPrimaryColor(config.primary_color || '#1677ff');
    setHeadingFont(config.heading_font || 'cormorant');
    setSiteTheme(config.site_theme || 'dark');
    setLogoUrl(config.logo_url || '');
    setHeroImageUrl(config.hero_image_url || '');
    setAboutImageUrl(config.about_image_url || '');
  }, [config, identityForm, appearanceForm, contentForm, socialForm]);

  const save = (key: string) => async (values: Record<string, string>) => {
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await apiClient.put<SiteConfig>('/config', values);
      setConfig(res.data);
      if (values.site_name) document.title = values.site_name;
      if (values.primary_color) {
        // Ant Design ConfigProvider picks it up on next render via App.tsx
      }
      if (values.heading_font) {
        document.documentElement.style.setProperty('--pg-heading-font', fontStacks[values.heading_font] ?? fontStacks.cormorant);
      }
      msg.success('Sauvegardé');
    } catch {
      msg.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const saveAppearance = async () => {
    const values = appearanceForm.getFieldsValue();
    await save('appearance')({ ...values, primary_color: primaryColor, heading_font: headingFont, site_theme: siteTheme, logo_url: logoUrl });
  };

  const savePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) { msg.error('Les mots de passe ne correspondent pas'); return; }
    setSaving((s) => ({ ...s, password: true }));
    try {
      await apiClient.put('/auth/password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      msg.success('Mot de passe modifié');
      passwordForm.resetFields();
    } catch {
      msg.error('Mot de passe actuel incorrect');
    } finally {
      setSaving((s) => ({ ...s, password: false }));
    }
  };

  const tabItems = [
    {
      key: 'identity',
      label: 'Identité',
      children: (
        <Form form={identityForm} layout="vertical" onFinish={save('identity')}>
          <Row gutter={24}>
            <Col span={24}>
              <ImageUploadField
                label="Logo"
                type="logo"
                currentUrl={logoUrl}
                onSuccess={(url) => { setLogoUrl(url); setConfig({ ...config, logo_url: url }); }}
                hint="Affiché dans le header et la page de connexion"
                aspectHint="PNG ou SVG avec fond transparent recommandé"
              />
              <Divider />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="site_name" label="Nom du site" rules={[{ required: true }]}>
                <Input placeholder="PhotoGal" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contact_email" label="Email de contact">
                <Input type="email" placeholder="contact@votresite.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="site_description" label="Description courte">
                <Input placeholder="Photographe professionnel basé à Paris" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="footer_text" label="Texte du pied de page">
                <Input placeholder="© 2024 VotreSite. Tous droits réservés." />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving.identity}>
            Sauvegarder
          </Button>
        </Form>
      ),
    },
    {
      key: 'appearance',
      label: 'Apparence',
      children: (
        <div>
          <Divider orientation="left">Thème</Divider>
          <Form.Item label="Apparence générale du site public">
            <Radio.Group
              value={siteTheme}
              onChange={(e) => setSiteTheme(e.target.value)}
              style={{ display: 'flex', gap: 16 }}
            >
              <Radio.Button value="dark">
                <Space>
                  <span style={{ display: 'inline-block', width: 16, height: 16, background: '#111', borderRadius: 3, verticalAlign: 'middle', border: '1px solid #d9d9d9' }} />
                  Sombre
                </Space>
              </Radio.Button>
              <Radio.Button value="light">
                <Space>
                  <span style={{ display: 'inline-block', width: 16, height: 16, background: '#fff', borderRadius: 3, verticalAlign: 'middle', border: '1px solid #d9d9d9' }} />
                  Clair
                </Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider orientation="left">Couleurs</Divider>
          <Form.Item label="Couleur principale (boutons, liens actifs)">
            <ColorPicker
              value={primaryColor}
              onChange={(c: Color) => setPrimaryColor(c.toHexString())}
              showText format="hex"
              presets={[{
                label: 'Suggestions',
                colors: ['#1677ff', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#111111', '#64748b'],
              }]}
            />
          </Form.Item>

          <Divider orientation="left">Typographie</Divider>
          <Form.Item label="Police des titres">
            <Radio.Group
              value={headingFont}
              onChange={(e) => setHeadingFont(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {FONT_OPTIONS.map((opt) => (
                <Radio key={opt.value} value={opt.value}>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontSize: 22, lineHeight: 1.2, ...opt.style, color: headingFont === opt.value ? '#1677ff' : '#111' }}>
                      {opt.sample}
                    </span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{opt.label}</Text>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          <Divider orientation="left">Image hero</Divider>
          <ImageUploadField
            label="Photo de fond du hero (page d'accueil)"
            type="hero"
            currentUrl={heroImageUrl}
            onSuccess={(url) => { setHeroImageUrl(url); setConfig({ ...config, hero_image_url: url }); save('hero')({ hero_image_url: url }); }}
            hint="Si vide, un dégradé sombre est utilisé"
            aspectHint="Résolution recommandée : 1920×1080 minimum"
          />

          <Divider />
          <Button type="primary" icon={<SaveOutlined />} onClick={saveAppearance} loading={saving.appearance}>
            Sauvegarder l'apparence
          </Button>
        </div>
      ),
    },
    {
      key: 'content',
      label: 'Contenu',
      children: (
        <Form form={contentForm} layout="vertical" onFinish={save('content')}>
          <Divider orientation="left">Section hero</Divider>
          <Form.Item name="hero_title" label="Grand titre">
            <Input placeholder="Bienvenue sur PhotoGal" />
          </Form.Item>
          <Form.Item name="hero_subtitle" label="Sous-titre">
            <TextArea rows={2} placeholder="Découvrez nos galeries photos et téléchargez vos favoris" />
          </Form.Item>

          <Divider orientation="left">Section «&nbsp;À propos&nbsp;»</Divider>
          <Alert
            type="info"
            showIcon
            message="La section À propos s'affiche sur la page d'accueil si le texte est renseigné."
            style={{ marginBottom: 20 }}
          />
          <Row gutter={24}>
            <Col span={24} style={{ marginBottom: 20 }}>
              <ImageUploadField
                label="Photo du photographe"
                type="about"
                currentUrl={aboutImageUrl}
                onSuccess={(url) => { setAboutImageUrl(url); setConfig({ ...config, about_image_url: url }); save('about')({ about_image_url: url }); }}
                aspectHint="Format portrait recommandé"
              />
            </Col>
            <Col span={24}>
              <Form.Item name="about_title" label="Titre de la section">
                <Input placeholder="À propos" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="about_text" label="Biographie / présentation">
                <TextArea
                  rows={6}
                  placeholder="Photographe passionné basé à Paris, je capture les moments qui comptent..."
                />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving.content}>
            Sauvegarder
          </Button>
        </Form>
      ),
    },
    {
      key: 'social',
      label: 'Contact & Réseaux',
      children: (
        <Form form={socialForm} layout="vertical" onFinish={save('social')}>
          <Alert
            type="info"
            showIcon
            message="Les réseaux renseignés s'affichent dans le footer du site."
            style={{ marginBottom: 24 }}
          />
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item name="social_instagram" label={<Space><InstagramOutlined /> Instagram</Space>}>
                <Input placeholder="https://instagram.com/votreprofil" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="social_facebook" label={<Space><GlobalOutlined /> Facebook</Space>}>
                <Input placeholder="https://facebook.com/votrepage" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="social_pinterest" label="Pinterest">
                <Input placeholder="https://pinterest.com/votrepage" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="social_website" label={<Space><GlobalOutlined /> Site web externe</Space>}>
                <Input placeholder="https://votresite.com" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving.social}>
            Sauvegarder
          </Button>
        </Form>
      ),
    },
    {
      key: 'storage',
      label: <Space><DatabaseOutlined />Stockage</Space>,
      children: (() => {
        const usedBytes = storageStats?.used_bytes ?? 0;
        const usedGb = usedBytes / (1024 ** 3);
        const limitGb = storageStats?.limit_gb ?? null;
        const percent = limitGb ? Math.min(Math.round((usedGb / limitGb) * 100), 100) : null;
        const status = percent != null ? (percent >= 90 ? 'exception' : percent >= 70 ? 'normal' : 'success') : 'normal';

        return (
          <div style={{ maxWidth: 520 }}>
            <Divider orientation="left">Utilisation actuelle</Divider>
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Statistic
                  title="Espace utilisé"
                  value={usedGb < 1 ? (usedBytes / (1024 ** 2)).toFixed(0) : usedGb.toFixed(2)}
                  suffix={usedGb < 1 ? 'Mo' : 'Go'}
                  valueStyle={{ color: percent != null && percent >= 90 ? '#ff4d4f' : undefined }}
                />
              </Col>
              {limitGb && (
                <Col span={12}>
                  <Statistic title="Limite" value={limitGb} suffix="Go" />
                </Col>
              )}
            </Row>

            {limitGb && percent != null && (
              <Progress
                percent={percent}
                status={status}
                strokeColor={percent >= 90 ? '#ff4d4f' : percent >= 70 ? '#faad14' : '#52c41a'}
                style={{ marginBottom: 24 }}
                format={(p) => `${p}%`}
              />
            )}

            {percent != null && percent >= 90 && (
              <Alert
                type="error"
                showIcon
                message="Espace presque saturé"
                description="Supprimez des photos ou albums pour libérer de l'espace, ou augmentez la limite."
                style={{ marginBottom: 24 }}
              />
            )}
            {percent != null && percent >= 70 && percent < 90 && (
              <Alert
                type="warning"
                showIcon
                message="Espace bientôt saturé"
                description={`Il vous reste ${((limitGb! - usedGb)).toFixed(2)} Go disponibles.`}
                style={{ marginBottom: 24 }}
              />
            )}

            <Divider orientation="left">Limite de stockage</Divider>
            <Alert
              type="info"
              showIcon
              message={limitGb ? `Limite fixée à ${limitGb} Go via variable d'environnement STORAGE_LIMIT_GB.` : "Aucune limite définie. Ajoutez STORAGE_LIMIT_GB dans votre .env pour activer."}
              description="Les uploads sont bloqués si la limite est atteinte."
            />
          </div>
        );
      })(),
    },
    {
      key: 'security',
      label: 'Sécurité',
      children: (
        <div style={{ maxWidth: 420 }}>
          <Alert type="info" showIcon message="Changez votre mot de passe administrateur." style={{ marginBottom: 24 }} />
          <Form form={passwordForm} layout="vertical" onFinish={savePassword}>
            <Form.Item name="currentPassword" label="Mot de passe actuel" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item name="newPassword" label="Nouveau mot de passe" rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item name="confirmPassword" label="Confirmer" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving.password}>
              Modifier le mot de passe
            </Button>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Paramètres du site</Title>}
      bodyStyle={{ padding: '8px 24px 24px' }}
    >
      {ctxHolder}
      <Tabs items={tabItems} size="large" />
    </Card>
  );
}
