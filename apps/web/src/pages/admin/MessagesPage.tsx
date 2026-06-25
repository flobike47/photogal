import {
  Card,
  Table,
  Tag,
  Button,
  Popconfirm,
  message,
  Typography,
  Space,
  Drawer,
  Divider,
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  MailOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../api/client';
import type { ContactMessage } from '../../types';

const { Title, Text, Paragraph } = Typography;

export function MessagesPage() {
  const qc = useQueryClient();
  const [msg, contextHolder] = message.useMessage();
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: () =>
      apiClient.get<{ messages: ContactMessage[]; unread: number }>('/contact').then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/contact/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/contact/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
      msg.success('Message supprimé');
      setSelected(null);
    },
  });

  const openMessage = (record: ContactMessage) => {
    setSelected(record);
    if (record.read === 0) markReadMutation.mutate(record.id);
  };

  const columns = [
    {
      title: '',
      key: 'read',
      width: 8,
      render: (_: unknown, record: ContactMessage) =>
        record.read === 0 ? (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1677ff' }} />
        ) : null,
    },
    {
      title: 'De',
      key: 'from',
      render: (_: unknown, record: ContactMessage) => (
        <Space direction="vertical" size={0}>
          <Text strong={record.read === 0}>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300, display: 'block' }}>{text}</Text>
      ),
    },
    {
      title: 'Reçu le',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Statut',
      key: 'status',
      width: 100,
      render: (_: unknown, record: ContactMessage) =>
        record.read ? (
          <Tag icon={<CheckOutlined />} color="default">Lu</Tag>
        ) : (
          <Tag icon={<MailOutlined />} color="blue">Non lu</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ContactMessage) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openMessage(record)}>
            Lire
          </Button>
          <Popconfirm
            title="Supprimer ce message ?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Supprimer"
            okType="danger"
            cancelText="Annuler"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>Messages de contact</Title>
          {(data?.unread ?? 0) > 0 && (
            <Tag color="blue">{data?.unread} non lu(s)</Tag>
          )}
        </Space>
      }
    >
      {contextHolder}
      <Table
        dataSource={data?.messages ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => openMessage(record),
          style: { cursor: 'pointer', fontWeight: record.read === 0 ? 600 : 400 },
        })}
      />

      <Drawer
        title={selected ? `Message de ${selected.name}` : ''}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
        extra={
          selected && (
            <Popconfirm
              title="Supprimer ce message ?"
              onConfirm={() => deleteMutation.mutate(selected.id)}
              okText="Supprimer"
              okType="danger"
              cancelText="Annuler"
            >
              <Button danger size="small" icon={<DeleteOutlined />}>Supprimer</Button>
            </Popconfirm>
          )
        }
      >
        {selected && (
          <>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Nom</Text>
                <div><Text strong>{selected.name}</Text></div>
              </div>
              <div>
                <Text type="secondary">Email</Text>
                <div>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </div>
              </div>
              <div>
                <Text type="secondary">Reçu le</Text>
                <div><Text>{dayjs(selected.created_at).format('DD/MM/YYYY à HH:mm')}</Text></div>
              </div>
            </Space>
            <Divider />
            <Text type="secondary">Message</Text>
            <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.message}</Paragraph>
            <Button
              type="primary"
              href={`mailto:${selected.email}?subject=Re: Votre message`}
              icon={<MailOutlined />}
              style={{ marginTop: 16 }}
            >
              Répondre par email
            </Button>
          </>
        )}
      </Drawer>
    </Card>
  );
}
