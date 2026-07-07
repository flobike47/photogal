import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Typography,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  ReloadOutlined,
  PictureOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import type { Album } from '../../types';

const { Title } = Typography;

interface AlbumForm {
  name: string;
  description?: string;
  is_public: boolean;
  is_downloadable: boolean;
  is_portfolio: boolean;
  password?: string;
  allowed_emails: string[];
}

export function AlbumsPage() {
  const qc = useQueryClient();
  const [msg, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [form] = Form.useForm<AlbumForm>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-albums'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: AlbumForm) => apiClient.post<Album>('/albums', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Album créé');
      setModalOpen(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AlbumForm }) =>
      apiClient.put<Album>(`/albums/${id}`, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Album mis à jour');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/albums/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Album supprimé');
    },
  });

  const regenTokenMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ share_token: string }>(`/albums/${id}/regenerate-token`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      const url = `${window.location.origin}/share/${data.share_token}`;
      void navigator.clipboard.writeText(url);
      msg.success('Nouveau lien généré et copié !');
    },
  });

  const uploadCover = async (file: File, albumId: string) => {
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/albums/${albumId}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = `/api/albums/${albumId}/cover?t=${Date.now()}`;
      setCoverPreview(url);
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Couverture mise à jour');
    } catch {
      msg.error('Erreur lors de l\'upload');
    } finally {
      setCoverUploading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setCoverPreview(null);
    form.resetFields();
    form.setFieldsValue({ is_public: true, is_downloadable: true, is_portfolio: false, allowed_emails: [] });
    setModalOpen(true);
  };

  const openEdit = async (album: Album) => {
    setEditing(album);
    setCoverPreview(album.cover_url ? `/api/albums/${album.id}/cover?t=${Date.now()}` : null);
    const { data } = await apiClient.get<Album>(`/albums/${album.id}`);
    form.setFieldsValue({
      name: data.name,
      description: data.description,
      is_public: data.is_public === 1,
      is_downloadable: data.is_downloadable !== 0,
      is_portfolio: data.is_portfolio === 1,
      password: '',
      allowed_emails: data.allowed_emails ?? [],
    });
    setModalOpen(true);
  };

  const copyLink = (shareToken: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
    void navigator.clipboard.writeText(url);
    msg.success('Lien copié dans le presse-papiers');
  };

  const onSubmit = (values: AlbumForm) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Album) => (
        <Link to={`/admin/albums/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: 'Photos',
      dataIndex: 'photo_count',
      key: 'photo_count',
      width: 90,
      render: (count: number) => <Badge count={count} showZero color="blue" />,
    },
    {
      title: 'Statut',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 110,
      render: (val: number) =>
        val ? (
          <Tag icon={<EyeOutlined />} color="success">Public</Tag>
        ) : (
          <Tag icon={<EyeInvisibleOutlined />} color="default">Privé</Tag>
        ),
    },
    {
      title: 'Créé le',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 130,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Album) => (
        <Space size="small">
          <Tooltip title="Gérer les photos">
            <Link to={`/admin/albums/${record.id}`}>
              <Button size="small" icon={<PictureOutlined />} />
            </Link>
          </Tooltip>
          <Tooltip title="Copier le lien de partage">
            <Button size="small" icon={<LinkOutlined />} onClick={() => copyLink(record.share_token)} />
          </Tooltip>
          <Tooltip title="Régénérer le lien">
            <Popconfirm
              title="Régénérer le lien ?"
              description="L'ancien lien ne fonctionnera plus."
              onConfirm={() => regenTokenMutation.mutate(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button size="small" icon={<ReloadOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Modifier">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Popconfirm
              title="Supprimer cet album ?"
              description="Toutes les photos seront également supprimées."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Supprimer"
              okType="danger"
              cancelText="Annuler"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Albums</Title>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nouvel album
        </Button>
      }
    >
      {contextHolder}
      <Table
        dataSource={data?.albums ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editing ? 'Modifier l\'album' : 'Nouvel album'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input placeholder="Nom de l'album" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Description (optionnelle)" />
          </Form.Item>
          <Form.Item name="is_public" label="Visible publiquement" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Privé" />
          </Form.Item>
          <Form.Item name="is_downloadable" label="Téléchargeable" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
          <Form.Item name="is_portfolio" label="Afficher dans le Portfolio" valuePropName="checked">
            <Switch checkedChildren="Portfolio" unCheckedChildren="Albums" />
          </Form.Item>
          {editing && (
            <Form.Item label="Image de couverture" extra="Optionnel — image indépendante des photos de l'album">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="couverture"
                    style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #333' }}
                  />
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && editing) await uploadCover(file, editing.id);
                    e.target.value = '';
                  }}
                />
                <Button
                  icon={<UploadOutlined />}
                  loading={coverUploading}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverPreview ? 'Changer la couverture' : 'Choisir une image'}
                </Button>
              </div>
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label="Mot de passe d'accès (albums privés)"
            extra={editing ? "Laissez vide pour ne pas modifier · saisissez un texte pour changer · effacez tout pour supprimer" : "Optionnel — permet l'accès depuis la page d'accueil sans connexion"}
          >
            <Input.Password placeholder="Laisser vide = pas de mot de passe" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="allowed_emails"
            label="Accès par email"
            extra="Les utilisateurs connectés avec ces emails verront cet album dans 'Mes albums'"
          >
            <Select
              mode="tags"
              placeholder="ajouter@email.com"
              tokenSeparators={[',', ' ']}
              open={false}
              suffixIcon={null}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => { setModalOpen(false); setEditing(null); }}>Annuler</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
