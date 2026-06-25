import { Card, Form, Input, Button, Typography, Result, Alert } from 'antd';
import { MailOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface FormValues {
  name: string;
  email: string;
  message: string;
}

export function ContactPage() {
  const [form] = Form.useForm<FormValues>();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { config } = useSiteConfigStore();

  const onFinish = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/contact', values);
      setSent(true);
      form.resetFields();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '48px auto', padding: '0 24px' }}>
      <Title level={2} style={{ textAlign: 'center' }}>Nous contacter</Title>
      {config.contact_email && (
        <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
          <MailOutlined /> {config.contact_email}
        </Paragraph>
      )}

      {sent ? (
        <Result
          status="success"
          title="Message envoyé !"
          subTitle="Nous reviendrons vers vous dans les plus brefs délais."
          extra={<Button type="primary" onClick={() => setSent(false)}>Envoyer un autre message</Button>}
        />
      ) : (
        <Card>
          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Veuillez saisir votre nom' }]}>
              <Input prefix={<UserOutlined />} placeholder="Votre nom" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Veuillez saisir votre email' },
                { type: 'email', message: 'Email invalide' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="votre@email.com" />
            </Form.Item>
            <Form.Item name="message" label="Message" rules={[{ required: true, message: 'Veuillez saisir votre message' }]}>
              <TextArea rows={5} placeholder="Votre message..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Envoyer
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
