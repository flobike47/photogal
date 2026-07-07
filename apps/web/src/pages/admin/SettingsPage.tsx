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
import { RichTextEditor } from '../../components/RichTextEditor';

const { Title, Text } = Typography;

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
  type: 'logo' | 'hero' | 'about' | 'contact';
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
          <div style={{ width: type === 'hero' || type === 'contact' ? 160 : 72, height: type === 'hero' || type === 'contact' ? 90 : 72, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9' }}>
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
  const [siteDescription, setSiteDescription] = useState(config.site_description || '');
  const [footerText, setFooterText] = useState(config.footer_text || '');
  const [heroTitle, setHeroTitle] = useState(config.hero_title || '');
  const [heroSubtitle, setHeroSubtitle] = useState(config.hero_subtitle || '');
  const [ctaButtonText, setCtaButtonText] = useState(config.cta_button_text || '');
  const [portfolioTitle, setPortfolioTitle] = useState(config.portfolio_title || '');
  const [portfolioCtatext, setPortfolioCtatext] = useState(config.portfolio_cta_text || '');
  const [aboutTitle, setAboutTitle] = useState(config.about_title || '');
  const [aboutText, setAboutText] = useState(config.about_text || '');
  const [contactPageTitle, setContactPageTitle] = useState(config.contact_page_title || '');
  const [contactBgUrl, setContactBgUrl] = useState(config.contact_bg_url || '');
  const [contactBgColor, setContactBgColor] = useState(config.contact_bg_color || '');
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    identityForm.setFieldsValue({ site_name: config.site_name, contact_email: config.contact_email });
    setSiteDescription(config.site_description || '');
    setFooterText(config.footer_text || '');
    appearanceForm.setFieldsValue({ heading_font: config.heading_font || 'cormorant' });
    setHeroTitle(config.hero_title || '');
    setCtaButtonText(config.cta_button_text || '');
    setPortfolioTitle(config.portfolio_title || '');
    setPortfolioCtatext(config.portfolio_cta_text || '');
    setAboutTitle(config.about_title || '');
    setContactPageTitle(config.contact_page_title || '');
    socialForm.setFieldsValue({ social_instagram: config.social_instagram, social_facebook: config.social_facebook, social_pinterest: config.social_pinterest, social_website: config.social_website });
    setPrimaryColor(config.primary_color || '#1677ff');
    setHeadingFont(config.heading_font || 'cormorant');
    setSiteTheme(config.site_theme || 'dark');
    setLogoUrl(config.logo_url || '');
    setHeroImageUrl(config.hero_image_url || '');
    setAboutImageUrl(config.about_image_url || '');
    setHeroSubtitle(config.hero_subtitle || '');
    setAboutText(config.about_text || '');
    setContactBgUrl(config.contact_bg_url || '');
    setContactBgColor(config.contact_bg_color || '');
  }, [config, identityForm, appearanceForm, contentForm, socialForm]);

  const save = (key: string) => async (values: Record<string, string>) => {
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await apiClient.put<SiteConfig>('/config', values);
      setConfig(res.data);
      if (values.site_name) document.title = values.site_name;
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

  const saveContent = async () => {
    await save('content')({
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      cta_button_text: ctaButtonText,
      portfolio_title: portfolioTitle,
      portfolio_cta_text: portfolioCtatext,
      about_title: aboutTitle,
      about_text: aboutText,
      contact_page_title: contactPageTitle,
    });
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
        <Form form={identityForm} layout="vertical">
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
              <Form.Item label="Description courte">
                <RichTextEditor value={siteDescription} onChange={setSiteDescription} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Texte du pied de page">
                <RichTextEditor value={footerText} onChange={setFooterText} />
              </Form.Item>
            </Col>
          </Row>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving.identity}
            onClick={async () => {
              const values = identityForm.getFieldsValue();
              await save('identity')({ ...values, site_description: siteDescription, footer_text: footerText });
            }}
          >
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
        <Form form={contentForm} layout="vertical">
          <Divider orientation="left">Section hero</Divider>
          <Form.Item label="Grand titre">
            <RichTextEditor value={heroTitle} onChange={setHeroTitle} />
          </Form.Item>
          <Form.Item label="Sous-titre">
            <RichTextEditor value={heroSubtitle} onChange={setHeroSubtitle} />
          </Form.Item>
          <Form.Item label="Texte du bouton CTA (hero)">
            <RichTextEditor value={ctaButtonText} onChange={setCtaButtonText} />
          </Form.Item>

          <Divider orientation="left">Section Portfolio</Divider>
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Titre de la section">
                <RichTextEditor value={portfolioTitle} onChange={setPortfolioTitle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Texte du lien CTA portfolio">
                <RichTextEditor value={portfolioCtatext} onChange={setPortfolioCtatext} />
              </Form.Item>
            </Col>
          </Row>

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
              <Form.Item label="Titre de la section">
                <RichTextEditor value={aboutTitle} onChange={setAboutTitle} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Biographie / présentation">
                <RichTextEditor value={aboutText} onChange={setAboutText} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Page Contact</Divider>
          <Form.Item label="Titre de la page contact">
            <RichTextEditor value={contactPageTitle} onChange={setContactPageTitle} />
          </Form.Item>

          <Button type="primary" icon={<SaveOutlined />} onClick={saveContent} loading={saving.content}>
            Sauvegarder
          </Button>
        </Form>
      ),
    },
    {
      key: 'social',
      label: 'Contact & Réseaux',
      children: (
        <div>
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

          <Divider orientation="left">Arrière-plan page Contact</Divider>
          <Alert
            type="info"
            showIcon
            message="Personnalisez le panneau gauche de la page Contact : photo ou couleur de fond."
            style={{ marginBottom: 24 }}
          />
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Couleur de fond (si pas d'image)</Text>
              </div>
              <ColorPicker
                value={contactBgColor || '#0a0a0a'}
                onChange={(c: Color) => setContactBgColor(c.toHexString())}
                showText format="hex"
                presets={[{
                  label: 'Suggestions',
                  colors: ['#0a0a0a', '#111827', '#1e293b', '#312e81', '#4a1942', '#064e3b', '#7c2d12'],
                }]}
              />
            </Col>
            <Col xs={24} sm={12}>
              <ImageUploadField
                label="Photo de fond (remplace la couleur)"
                type="contact"
                currentUrl={contactBgUrl}
                onSuccess={(url) => {
                  setContactBgUrl(url);
                  setConfig({ ...config, contact_bg_url: url });
                  save('contact_bg')({ contact_bg_url: url });
                }}
                aspectHint="Format portrait ou carré recommandé"
              />
            </Col>
          </Row>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving.contact_bg}
            onClick={() => save('contact_bg')({ contact_bg_color: contactBgColor, contact_bg_url: contactBgUrl })}
          >
            Sauvegarder le fond Contact
          </Button>
        </div>
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
