import { Typography, Row, Col, Image, Button, Spin, Result, Space, Tag, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import type { Album, Photo } from '../../types';

const { Title, Paragraph, Text } = Typography;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-album', token],
    queryFn: () =>
      apiClient.get<{ album: Album; photos: Photo[] }>(`/albums/share/${token}`).then((r) => r.data),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Result
        status="404"
        title="Album introuvable"
        subTitle="Ce lien n'existe pas ou a été désactivé."
      />
    );
  }

  const { album, photos } = data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{album.name}</Title>
        {album.description && (
          <Paragraph type="secondary" style={{ fontSize: 16 }}>{album.description}</Paragraph>
        )}
        <Space>
          <Tag icon={<CalendarOutlined />} color="default">
            {dayjs(album.created_at).format('DD/MM/YYYY')}
          </Tag>
          <Tag color="blue">{photos.length} photo(s)</Tag>
        </Space>
      </div>

      {photos.length === 0 ? (
        <Result
          icon={<span style={{ fontSize: 64 }}>📷</span>}
          title="Aucune photo dans cet album"
        />
      ) : (
        <Image.PreviewGroup>
          <Row gutter={[16, 16]}>
            {photos.map((photo) => (
              <Col key={photo.id} xs={24} sm={12} md={8} lg={6}>
                <div
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Image
                    src={`/uploads/photos/${photo.album_id}/${photo.filename}`}
                    alt={photo.original_name}
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                    preview={{ src: `/uploads/photos/${photo.album_id}/${photo.filename}` }}
                  />
                  <div style={{ padding: '10px 12px' }}>
                    <Tooltip title={photo.original_name}>
                      <Text ellipsis style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                        {photo.original_name}
                      </Text>
                    </Tooltip>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{formatSize(photo.size)}</Text>
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={`/api/photos/download/${photo.share_token}`}
                        target="_blank"
                      >
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Image.PreviewGroup>
      )}
    </div>
  );
}
