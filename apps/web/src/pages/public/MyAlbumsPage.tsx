import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import type { Album } from '../../types';

export function MyAlbumsPage() {
  const { config } = useSiteConfigStore();
  const isDark = (config.site_theme ?? 'dark') !== 'light';

  const t = isDark ? {
    page: '#0d0d0d',
    label: 'rgba(255,255,255,0.25)',
    h2: '#fff',
    empty: 'rgba(255,255,255,0.2)',
  } : {
    page: '#fff',
    label: 'rgba(0,0,0,0.28)',
    h2: '#111',
    empty: 'rgba(0,0,0,0.25)',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-albums'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums/my').then((r) => r.data),
  });

  const albums = data?.albums ?? [];

  return (
    <div style={{ background: t.page, paddingTop: 72 }}>
      <section style={{ padding: '96px 48px 120px' }}>
        <div style={{ marginBottom: 64 }}>
          <p style={{ color: t.label, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
            Mes albums
          </p>
          <h2
            className="pg-heading"
            style={{ color: t.h2, fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}
          >
            Albums partagés avec moi
          </h2>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : albums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ color: t.empty, fontSize: 15, letterSpacing: '0.1em' }}>
              Aucun album partagé avec vous pour l'instant
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {albums.map((album, i) => (
              <Link
                key={album.id}
                to={`/share/${album.share_token}`}
                className="pg-album-card"
                style={{ aspectRatio: '3/4' }}
              >
                {(album.cover_url || album.cover_photo_id) ? (
                  <img
                    src={album.cover_url || `/uploads/photos/${album.id}/${album.cover_photo_id}`}
                    alt={album.name}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%', height: '100%',
                      background: `hsl(${(i * 53) % 360}, 12%, 16%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={0.2}>
                      <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="1.5" />
                      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="1.5" />
                      <circle cx="24" cy="24" r="3" fill="white" />
                    </svg>
                  </div>
                )}

                <div className="pg-album-overlay">
                  <div className="pg-album-extras" style={{ marginBottom: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                      {album.photo_count ?? 0} photo{(album.photo_count ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <h3 className="pg-heading" style={{ color: '#fff', fontSize: 24, fontWeight: 300, margin: '0 0 12px', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                    {album.name}
                  </h3>
                  <div className="pg-album-extras">
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 2, fontFamily: 'Inter, sans-serif' }}>
                      Voir la galerie →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
