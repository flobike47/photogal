import { Typography, Row, Col, Card, Button, Spin, Empty, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShareAltOutlined, PictureOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import type { Album } from '../../types';

const { Title, Paragraph } = Typography;

export function HomePage() {
  const { config } = useSiteConfigStore();

  const { data, isLoading } = useQuery({
    queryKey: ['public-albums'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums/public').then((r) => r.data),
  });

  const publicAlbums = data?.albums ?? [];

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #001529 0%, #003366 100%)',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <Title style={{ color: '#fff', fontSize: 48, marginBottom: 16 }}>
          {config.hero_title}
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 32 }}>
          {config.hero_subtitle}
        </Paragraph>
        <Button type="primary" size="large">
          <a href="#albums">Voir les albums</a>
        </Button>
      </div>

      {/* Albums grid */}
      <div id="albums" style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
          Nos galeries
        </Title>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : publicAlbums.length === 0 ? (
          <Empty description="Aucune galerie disponible pour l'instant" />
        ) : (
          <Row gutter={[24, 24]}>
            {publicAlbums.map((album) => (
              <Col key={album.id} xs={24} sm={12} md={8} lg={6}>
                <Link to={`/share/${album.share_token}`} style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    cover={
                      album.cover_photo_id ? (
                        <img
                          src={`/uploads/photos/${album.id}/${album.cover_photo_id}`}
                          alt={album.name}
                          style={{ height: 200, objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f0f2f5',
                          }}
                        >
                          <PictureOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                        </div>
                      )
                    }
                    actions={[
                      <Tag icon={<ShareAltOutlined />} color="blue" key="share">
                        Voir & télécharger
                      </Tag>,
                    ]}
                  >
                    <Card.Meta
                      title={album.name}
                      description={
                        <Typography.Text type="secondary" ellipsis>
                          {album.description || `${album.photo_count ?? 0} photo(s)`}
                        </Typography.Text>
                      }
                    />
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
