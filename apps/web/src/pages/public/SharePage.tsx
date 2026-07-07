import { useState } from 'react';
import { Image, Button, Spin, Tooltip, message } from 'antd';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { DownloadOutlined, EyeOutlined, CheckOutlined, CloseOutlined, LinkOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import type { Album, Photo } from '../../types';

dayjs.locale('fr');

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function PhotoCard({
  photo,
  isSelected,
  onToggle,
  accentColor,
  downloadable,
}: {
  photo: Photo;
  isSelected: boolean;
  onToggle: () => void;
  accentColor: string;
  downloadable: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const src = `/api/photos/${photo.id}/thumb`;
  const fullSrc = `/api/photos/${photo.id}/original`;

  return (
    <div className="pg-photo-card" style={{ position: 'relative' }}>
      {downloadable && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            position: 'absolute',
            top: 10, left: 10,
            zIndex: 10,
            width: 22, height: 22,
            borderRadius: 4,
            border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.55)'}`,
            background: isSelected ? accentColor : 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            backdropFilter: 'blur(4px)',
          }}
        >
          {isSelected && <CheckOutlined style={{ color: '#fff', fontSize: 11 }} />}
        </div>
      )}

      <Image
        src={src}
        alt={photo.original_name}
        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
        loading="lazy"
        preview={{
          src: fullSrc,
          visible,
          onVisibleChange: (v) => setVisible(v),
          mask: (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <EyeOutlined style={{ fontSize: 22, color: '#fff' }} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                Aperçu
              </span>
              {downloadable && (
                <a href={`/api/photos/download/${photo.share_token}`} download onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                  <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={(e) => e.stopPropagation()}>
                    Télécharger
                  </Button>
                </a>
              )}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
                {formatSize(photo.size)}
              </span>
            </div>
          ),
        }}
      />
    </div>
  );
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { config } = useSiteConfigStore();
  const { email: userEmail } = useAuthStore();
  const accentColor = config.primary_color || '#1677ff';
  const [msgApi, contextHolder] = message.useMessage();
  const isMobile = useWindowWidth() < 768;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-album', token],
    queryFn: () =>
      apiClient.get<{ album: Album; photos: Photo[] }>(`/albums/share/${token}`).then((r) => r.data),
    enabled: !!token,
  });

  const photos = data?.photos ?? [];
  const allSelected = photos.length > 0 && selected.size === photos.length;

  const toggleSelect = (shareToken: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(shareToken)) next.delete(shareToken);
      else next.add(shareToken);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(photos.map((p) => p.share_token)));
  };

  const clearSelection = () => setSelected(new Set());

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const res = await apiClient.post('/photos/download-zip', { shareTokens: [...selected] }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selection.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setDownloading(false); }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            404
          </p>
          <h1 className="pg-heading" style={{ color: '#fff', fontSize: 48, fontWeight: 300, margin: '0 0 24px' }}>
            Album introuvable
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 40px', fontWeight: 300 }}>
            Ce lien n'existe pas ou a été désactivé.
          </p>
          <Link to="/" className="pg-btn-ghost">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const { album } = data;

  const userHasAccess = !!userEmail && (album.allowed_emails ?? [])
    .map((e) => e.toLowerCase())
    .includes(userEmail.toLowerCase());

  const copyShareLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    void msgApi.success('Lien copié !');
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {contextHolder}
      {/* ── Album header ── */}
      <div style={{ padding: isMobile ? '100px 20px 40px' : '120px 64px 64px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
            fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 48, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
        >
          ← Retour aux galeries
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
              {dayjs(album.created_at).format('DD MMMM YYYY')} &nbsp;·&nbsp; {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </p>
            <h1
              className="pg-heading"
              style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 68px)', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}
            >
              {album.name}
            </h1>
            {album.description && (
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 17, margin: '18px 0 0', fontWeight: 300, lineHeight: 1.65, maxWidth: 600 }}>
                {album.description}
              </p>
            )}
          </div>

          {/* Actions header */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {!!album.is_downloadable && (
                <Tooltip title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}>
                  <button
                    onClick={toggleAll}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.55)',
                      padding: '8px 16px',
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      borderRadius: 2,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  >
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </Tooltip>
              )}

              {userHasAccess && (
                <Tooltip title="Copier le lien de partage">
                  <Button
                    icon={<LinkOutlined />}
                    onClick={copyShareLink}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    Copier le lien
                  </Button>
                </Tooltip>
              )}
              {!!album.is_downloadable && (
                <a href={`/api/albums/share/${token}/download`} download style={{ textDecoration: 'none' }}>
                  <Button icon={<DownloadOutlined />} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                    Tout télécharger
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Photo grid ── */}
      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '120px 0', color: 'rgba(255,255,255,0.25)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 24, opacity: 0.2 }}>
            <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="9" stroke="white" strokeWidth="1.5" />
          </svg>
          <p style={{ fontSize: 14, letterSpacing: '0.1em' }}>Aucune photo dans cet album</p>
        </div>
      ) : (
        <Image.PreviewGroup>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 3,
              padding: 3,
            }}
          >
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selected.has(photo.share_token)}
                onToggle={() => toggleSelect(photo.share_token)}
                accentColor={accentColor}
                downloadable={!!data?.album?.is_downloadable}
              />
            ))}
          </div>
        </Image.PreviewGroup>
      )}

      {/* ── Hint ── */}
      {photos.length > 0 && selected.size === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px 80px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12, letterSpacing: '0.12em', margin: 0, fontFamily: 'Inter, sans-serif' }}>
            {album.is_downloadable
              ? 'Cliquez sur le carré pour sélectionner · Survolez pour apercevoir ou télécharger'
              : 'Survolez une photo pour l\'apercevoir'}
          </p>
        </div>
      )}

      {/* ── Floating selection bar ── */}
      {selected.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(16,16,16,0.96)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 1000,
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            <strong style={{ color: '#fff' }}>{selected.size}</strong> photo{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={clearSelection}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px 6px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <CloseOutlined style={{ fontSize: 11 }} /> Annuler
          </button>
          {!!album.is_downloadable && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={downloadSelected}
              style={{ borderRadius: 6 }}
            >
              Télécharger la sélection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
