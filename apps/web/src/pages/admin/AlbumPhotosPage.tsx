import {
  Card,
  Button,
  Row,
  Col,
  Image,
  Typography,
  Upload,
  Popconfirm,
  message,
  Spin,
  Result,
  Breadcrumb,
  Space,
  Tag,
  Tooltip,
  Badge,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  LinkOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { apiClient } from '../../api/client';
import type { Album, Photo } from '../../types';

const { Title, Text } = Typography;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AlbumPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [msg, contextHolder] = message.useMessage();

  const { data: albumData, isLoading: loadingAlbum } = useQuery({
    queryKey: ['admin-album', id],
    queryFn: () => apiClient.get<Album>(`/albums/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ['admin-album-photos', id],
    queryFn: () =>
      apiClient.get<{ photos: Photo[] }>(`/albums/${id}/photos`).then((r) => r.data),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => apiClient.delete(`/photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-album-photos', id] });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Photo supprimée');
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (photo: Photo) =>
      apiClient.put(`/albums/${photo.album_id}`, { cover_photo_id: photo.filename }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-album', id] });
      msg.success('Photo de couverture définie');
    },
  });

  const uploadPhoto = async (options: UploadRequestOption) => {
    const formData = new FormData();
    formData.append('file', options.file as File);
    try {
      await apiClient.post(`/photos/upload/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && options.onProgress) {
            options.onProgress({ percent: Math.round((e.loaded / e.total) * 100) });
          }
        },
      });
      options.onSuccess?.({});
      qc.invalidateQueries({ queryKey: ['admin-album-photos', id] });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch (err) {
      options.onError?.(err as Error);
      msg.error('Erreur lors de l\'upload');
    }
  };

  const copyShareLink = () => {
    if (!albumData) return;
    const url = `${window.location.origin}/share/${albumData.share_token}`;
    void navigator.clipboard.writeText(url);
    msg.success('Lien copié !');
  };

  if (loadingAlbum) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!albumData) return <Result status="404" title="Album introuvable" />;

  const photos = photosData?.photos ?? [];

  return (
    <div>
      {contextHolder}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/admin/albums">Albums</Link> },
          { title: albumData.name },
        ]}
      />

      <Card
        title={
          <Space>
            <Link to="/admin/albums">
              <Button type="text" icon={<ArrowLeftOutlined />} size="small" />
            </Link>
            <Title level={4} style={{ margin: 0 }}>{albumData.name}</Title>
            <Badge count={photos.length} showZero color="blue" />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<LinkOutlined />} onClick={copyShareLink}>
              Copier le lien
            </Button>
            <Upload
              multiple
              accept="image/*"
              showUploadList={false}
              customRequest={uploadPhoto}
            >
              <Button type="primary" icon={<UploadOutlined />}>
                Ajouter des photos
              </Button>
            </Upload>
          </Space>
        }
      >
        {albumData.description && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {albumData.description}
          </Text>
        )}

        {loadingPhotos ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <UploadOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
            <p>Aucune photo. Utilisez le bouton ci-dessus pour en ajouter.</p>
          </div>
        ) : (
          <Image.PreviewGroup>
            <Row gutter={[16, 16]}>
              {photos.map((photo) => {
                const isCover = albumData.cover_photo_id === photo.filename;
                return (
                  <Col key={photo.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                    <div
                      style={{
                        border: `2px solid ${isCover ? '#1677ff' : '#f0f0f0'}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#fff',
                        position: 'relative',
                      }}
                    >
                      {isCover && (
                        <Tag
                          color="blue"
                          style={{ position: 'absolute', top: 6, left: 6, zIndex: 1, fontSize: 10 }}
                        >
                          Couverture
                        </Tag>
                      )}
                      <Image
                        src={`/api/photos/${photo.id}/thumb`}
                        alt={photo.original_name}
                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '8px 10px' }}>
                        <Tooltip title={photo.original_name}>
                          <Text ellipsis style={{ display: 'block', fontSize: 11, marginBottom: 6 }}>
                            {photo.original_name}
                          </Text>
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>
                          {formatSize(photo.size)}
                        </Text>
                        <Space size={4}>
                          <Tooltip title="Définir comme couverture">
                            <Button
                              size="small"
                              icon={<StarOutlined />}
                              type={isCover ? 'primary' : 'default'}
                              onClick={() => setCoverMutation.mutate(photo)}
                            />
                          </Tooltip>
                          <Tooltip title="Copier le lien de téléchargement">
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                const url = `${window.location.origin}/api/photos/download/${photo.share_token}`;
                                void navigator.clipboard.writeText(url);
                                msg.success('Lien copié');
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <Popconfirm
                              title="Supprimer cette photo ?"
                              onConfirm={() => deleteMutation.mutate(photo.id)}
                              okText="Supprimer"
                              okType="danger"
                              cancelText="Annuler"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Tooltip>
                        </Space>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Image.PreviewGroup>
        )}
      </Card>
    </div>
  );
}
