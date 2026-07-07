import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Spin, Modal, Input, Form, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useAuthStore } from '../../store/authStore';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { htmlToInline } from '../../utils/html';
import type { Album } from '../../types';

export function HomePage() {
  const { config } = useSiteConfigStore();
  const { isAuthenticated } = useAuthStore();
  const isDark = (config.site_theme ?? 'dark') !== 'light';
  const isMobile = useWindowWidth() < 768;
  const navigate = useNavigate();
  const [msgApi, contextHolder] = message.useMessage();
  const [passwordModal, setPasswordModal] = useState<{ album: Album } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (!passwordModal) return;
    setUnlocking(true);
    try {
      const res = await apiClient.post<{ share_token: string }>(
        `/albums/${passwordModal.album.id}/unlock`,
        { password: passwordInput },
      );
      setPasswordModal(null);
      setPasswordInput('');
      navigate(`/share/${res.data.share_token}`);
    } catch {
      msgApi.error('Mot de passe incorrect');
    } finally {
      setUnlocking(false);
    }
  };

  const t = isDark ? {
    page: '#0a0a0a',
    galleries: '#0d0d0d',
    galleriesLabel: 'rgba(255,255,255,0.25)',
    galleriesH2: '#fff',
    galleriesLink: 'rgba(255,255,255,0.35)',
    galleriesLinkHover: 'rgba(255,255,255,0.7)',
    galleriesLinkBorder: 'rgba(255,255,255,0.18)',
    galleriesEmpty: 'rgba(255,255,255,0.2)',
    about: '#111',
    aboutBorder: 'rgba(255,255,255,0.05)',
    aboutLabel: 'rgba(255,255,255,0.22)',
    aboutH2: '#fff',
    aboutText: 'rgba(255,255,255,0.5)',
    ctaBg: '#0a0a0a',
    ctaBorder: 'rgba(255,255,255,0.05)',
    ctaLabel: 'rgba(255,255,255,0.25)',
    ctaH2: '#fff',
    ctaBtn: 'pg-btn-ghost',
    aboutBtn: 'pg-btn-ghost',
  } : {
    page: '#fff',
    galleries: '#fff',
    galleriesLabel: 'rgba(0,0,0,0.28)',
    galleriesH2: '#111',
    galleriesLink: 'rgba(0,0,0,0.4)',
    galleriesLinkHover: 'rgba(0,0,0,0.8)',
    galleriesLinkBorder: 'rgba(0,0,0,0.15)',
    galleriesEmpty: 'rgba(0,0,0,0.25)',
    about: '#f5f3ef',
    aboutBorder: 'rgba(0,0,0,0.06)',
    aboutLabel: 'rgba(0,0,0,0.28)',
    aboutH2: '#111',
    aboutText: 'rgba(0,0,0,0.55)',
    ctaBg: '#fafaf8',
    ctaBorder: 'rgba(0,0,0,0.06)',
    ctaLabel: 'rgba(0,0,0,0.28)',
    ctaH2: '#111',
    ctaBtn: 'pg-btn-dark',
    aboutBtn: 'pg-btn-dark',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['public-albums'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums/public').then((r) => r.data),
  });

  const { data: listingData, isLoading: listingLoading } = useQuery({
    queryKey: ['albums-listing'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums/listing').then((r) => r.data),
  });

  const { data: myData } = useQuery({
    queryKey: ['my-albums'],
    queryFn: () => apiClient.get<{ albums: Album[] }>('/albums/my').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const portfolioAlbums = data?.albums ?? [];
  const listingAlbums = listingData?.albums ?? [];
  const myAlbums = myData?.albums ?? [];

  return (
    <div style={{ background: t.page }}>
      {contextHolder}

      {/* ════ MODAL MOT DE PASSE ════ */}
      <Modal
        open={!!passwordModal}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined />
            {passwordModal?.album.name}
          </span>
        }
        okText="Accéder"
        cancelText="Annuler"
        confirmLoading={unlocking}
        onOk={handleUnlock}
        onCancel={() => { setPasswordModal(null); setPasswordInput(''); }}
        afterClose={() => setPasswordInput('')}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          Cet album est protégé. Entrez le mot de passe pour y accéder.
        </p>
        <Form onFinish={handleUnlock}>
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bbb' }} />}
            placeholder="Mot de passe"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
          />
        </Form>
      </Modal>

      {/* ════ HERO ════ */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '100px 32px 80px',
          position: 'relative',
          background: config.hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.72)), url(${config.hero_image_url}) center/cover no-repeat fixed`
            : 'radial-gradient(ellipse 80% 60% at 50% 40%, #1a1a2e 0%, #0a0a0a 70%)',
        }}
      >
        {/* Decorative vertical line */}
        <div className="pg-line-anim" style={{ width: 1, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.35))', marginBottom: 44, flexShrink: 0 }} />

        <p
          className="pg-fade-up-1"
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            margin: '0 0 28px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {config.site_description}
        </p>

        <h1
          className="pg-heading pg-fade-up-2"
          style={{
            color: '#fff',
            fontSize: 'clamp(44px, 8.5vw, 100px)',
            fontWeight: 300,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            margin: '0 0 32px',
            maxWidth: 980,
          }}
          dangerouslySetInnerHTML={{ __html: htmlToInline(config.hero_title) }}
        />

        <div
          className="pg-fade-up-3 pg-rich-text"
          dangerouslySetInnerHTML={{ __html: config.hero_subtitle }}
          style={{
            color: 'rgba(255,255,255,0.48)',
            fontSize: 'clamp(14px, 1.8vw, 18px)',
            fontWeight: 300,
            lineHeight: 1.75,
            margin: '0 0 52px',
            maxWidth: 480,
          }}
        />

        <a
          href="#galleries"
          className="pg-btn-ghost pg-fade-up-4"
          dangerouslySetInnerHTML={{ __html: htmlToInline(config.cta_button_text) || 'Découvrir les galeries' }}
        />

        {/* Scroll cue */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Scroll
          </span>
          <div
            className="pg-bounce"
            style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)' }}
          />
        </div>
      </section>

      {/* ════ ABOUT ════ */}
      {config.about_text && (
        <section style={{ background: t.about, padding: isMobile ? '64px 24px' : '100px 48px', borderTop: `1px solid ${t.aboutBorder}` }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 80, flexWrap: 'wrap' }}>
            {config.about_image_url && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 220, height: 280, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={config.about_image_url}
                    alt="portrait"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 260 }}>
              <p style={{ color: t.aboutLabel, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Inter, sans-serif' }}>
                À propos
              </p>
              <h2
                className="pg-heading"
                style={{ color: t.aboutH2, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, margin: '0 0 28px', letterSpacing: '-0.01em', lineHeight: 1.15 }}
                dangerouslySetInnerHTML={{ __html: htmlToInline(config.about_title) }}
              />
              <div
                dangerouslySetInnerHTML={{ __html: config.about_text }}
                style={{ color: t.aboutText, fontSize: 16, fontWeight: 300, lineHeight: 1.85, margin: '0 0 36px' }}
                className="pg-rich-text"
              />
              <Link to="/contact" className={t.aboutBtn} style={{ fontSize: 11 }}>
                Me contacter
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ════ GALLERIES ════ */}
      <section id="galleries" style={{ background: t.galleries, padding: isMobile ? '64px 16px 80px' : '96px 48px 120px' }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 64,
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div>
            <p style={{ color: t.galleriesLabel, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Portfolio
            </p>
            <h2
              className="pg-heading"
              style={{ color: t.galleriesH2, fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}
              dangerouslySetInnerHTML={{ __html: htmlToInline(config.portfolio_title) || 'Portfolio' }}
            />
          </div>
          <Link
            to="/contact"
            style={{
              color: t.galleriesLink,
              textDecoration: 'none',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${t.galleriesLinkBorder}`,
              paddingBottom: 3,
              transition: 'color 0.25s',
              fontWeight: 500,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.galleriesLinkHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.galleriesLink; }}
            dangerouslySetInnerHTML={{ __html: htmlToInline(config.portfolio_cta_text) || 'Réserver une séance →' }}
          />
        </div>

        {/* Albums grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : portfolioAlbums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ color: t.galleriesEmpty, fontSize: 15, letterSpacing: '0.1em' }}>
              Aucune galerie disponible pour l'instant
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 3,
            }}
          >
            {portfolioAlbums.map((album, i) => {
              const coverSrc = album.cover_url || (album.cover_photo_id ? `/api/photos/${album.cover_photo_id.replace(/\.[^/.]+$/, '')}/thumb` : null);
              return (
              <Link
                key={album.id}
                to={`/share/${album.share_token}`}
                className="pg-album-card"
                style={{ aspectRatio: '3/4' }}
              >
                {coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={album.name}
                    loading="lazy"
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
                  <h3
                    className="pg-heading"
                    style={{ color: '#fff', fontSize: 24, fontWeight: 300, margin: '0 0 12px', letterSpacing: '0.02em', lineHeight: 1.2 }}
                  >
                    {album.name}
                  </h3>
                  <div className="pg-album-extras">
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 2, fontFamily: 'Inter, sans-serif' }}>
                      Voir la galerie →
                    </span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ════ ALBUMS ════ */}
      {(listingLoading || listingAlbums.length > 0) && (
        <section style={{ background: t.galleries, padding: isMobile ? '64px 16px 80px' : '96px 48px 120px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ color: t.galleriesLabel, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
              Galeries
            </p>
            <h2 className="pg-heading" style={{ color: t.galleriesH2, fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}>
              Albums
            </h2>
          </div>

          {listingLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              {listingAlbums.map((album, i) => {
                const coverSrc = album.cover_url || (album.cover_photo_id ? `/api/photos/${album.cover_photo_id.replace(/\.[^/.]+$/, '')}/thumb` : null);
                const isPrivate = !album.share_token;
                const hasPassword = !!album.has_password;

                const cardInner = (
                  <>
                    {coverSrc ? (
                      <img src={coverSrc} alt={album.name} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `hsl(${(i * 53) % 360}, 12%, 16%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                          {isPrivate
                            ? (hasPassword ? '🔒 Protégé par mot de passe' : '🔒 Accès sur invitation')
                            : `${album.photo_count ?? 0} photo${(album.photo_count ?? 0) !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <h3 className="pg-heading" style={{ color: '#fff', fontSize: 24, fontWeight: 300, margin: '0 0 12px', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                        {album.name}
                      </h3>
                      <div className="pg-album-extras">
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 2, fontFamily: 'Inter, sans-serif' }}>
                          {isPrivate ? (hasPassword ? 'Entrer le mot de passe →' : 'Accès sur invitation') : 'Voir la galerie →'}
                        </span>
                      </div>
                    </div>
                  </>
                );

                if (!isPrivate) {
                  return (
                    <Link key={album.id} to={`/share/${album.share_token}`} className="pg-album-card" style={{ aspectRatio: '3/4' }}>
                      {cardInner}
                    </Link>
                  );
                }
                if (hasPassword) {
                  return (
                    <div
                      key={album.id}
                      className="pg-album-card"
                      style={{ aspectRatio: '3/4', cursor: 'pointer' }}
                      onClick={() => { setPasswordModal({ album }); setPasswordInput(''); }}
                    >
                      {cardInner}
                    </div>
                  );
                }
                return (
                  <div key={album.id} className="pg-album-card" style={{ aspectRatio: '3/4', cursor: 'default', opacity: 0.6 }}>
                    {cardInner}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ════ MES ALBUMS ════ */}
      {isAuthenticated && myAlbums.length > 0 && (
        <section style={{ background: t.galleries, padding: isMobile ? '64px 16px 80px' : '96px 48px 120px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ color: t.galleriesLabel, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
              Partagés avec moi
            </p>
            <h2 className="pg-heading" style={{ color: t.galleriesH2, fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}>
              Mes albums
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {myAlbums.map((album, i) => {
              const coverSrc = album.cover_url || (album.cover_photo_id ? `/api/photos/${album.cover_photo_id.replace(/\.[^/.]+$/, '')}/thumb` : null);
              return (
              <Link key={album.id} to={`/share/${album.share_token}`} className="pg-album-card" style={{ aspectRatio: '3/4' }}>
                {coverSrc ? (
                  <img src={coverSrc} alt={album.name} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: `hsl(${(i * 53) % 360}, 12%, 16%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              );
            })}
          </div>
        </section>
      )}

      {/* ════ BOTTOM CTA ════ */}
      <section
        style={{
          padding: '120px 48px',
          textAlign: 'center',
          background: t.ctaBg,
          borderTop: `1px solid ${t.ctaBorder}`,
        }}
      >
        <p style={{ color: t.ctaLabel, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 20px' }}>
          Vous avez un projet ?
        </p>
        <h2
          className="pg-heading"
          style={{ color: t.ctaH2, fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 300, margin: '0 0 40px', letterSpacing: '-0.01em' }}
        >
          Travaillons ensemble
        </h2>
        <Link to="/contact" className={t.ctaBtn}>
          Nous contacter
        </Link>
      </section>
    </div>
  );
}
