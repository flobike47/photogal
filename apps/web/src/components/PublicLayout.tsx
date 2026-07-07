import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSiteConfigStore } from '../store/siteConfigStore';
import { useAuthStore } from '../store/authStore';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { apiClient } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function ensureUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function PublicLayout() {
  const { config } = useSiteConfigStore();
  const { isAuthenticated, isAdmin, setAuth, logout } = useAuthStore();
  const location = useLocation();
  const width = useWindowWidth();
  const isMobile = width < 768;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleReady = useRef(false);

  const isHome = location.pathname === '/';
  const isDark = (config.site_theme ?? 'dark') !== 'light';
  const headerSolid = scrolled || !isHome || menuOpen;
  const headerDark = isHome || isDark;

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    try {
      const res = await apiClient.post<{ email: string; isAdmin: boolean }>('/auth/google', {
        credential: response.credential,
      });
      setAuth(res.data.email, res.data.isAdmin);
      setMenuOpen(false);
    } catch { /* silently ignore */ }
  }, [setAuth]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleReady.current) return;

    const init = () => {
      if (!window.google || !googleBtnRef.current || googleReady.current) return;
      googleReady.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'icon',
        theme: 'filled_black',
        size: 'medium',
        shape: 'circle',
      });
    };

    if (window.google) { init(); return; }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', init); return; }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [handleGoogleCredential]);

  const handleLogout = async () => {
    await apiClient.post('/auth/logout').catch(() => {});
    if (window.google) window.google.accounts.id.disableAutoSelect();
    googleReady.current = false;
    logout();
    setMenuOpen(false);
  };

  const navLinkStyle = (active: boolean) => ({
    color: headerDark ? (active ? '#fff' : 'rgba(255,255,255,0.55)') : (active ? '#111' : 'rgba(0,0,0,0.55)'),
    textDecoration: 'none',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
    borderBottom: active
      ? `1px solid ${headerDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}`
      : '1px solid transparent',
    paddingBottom: 2,
    transition: 'color 0.2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: isHome ? '#0a0a0a' : '#fff' }}>
      {/* ── Header ── */}
      <header
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 20px' : '0 48px',
          transition: 'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
          background: headerSolid
            ? (headerDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.96)')
            : 'transparent',
          backdropFilter: headerSolid ? 'blur(16px)' : 'none',
          borderBottom: headerSolid
            ? (headerDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)')
            : '1px solid transparent',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
          {config.logo_url ? (
            <img src={config.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="14" cy="14" r="13" stroke={headerDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} strokeWidth="1.5" />
              <circle cx="14" cy="14" r="6" stroke={headerDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} strokeWidth="1.5" />
              <circle cx="14" cy="14" r="2" fill={headerDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} />
            </svg>
          )}
          {!isMobile && (
            <span className="pg-heading" style={{ color: headerDark ? '#fff' : '#111', fontSize: 20, fontWeight: 300, letterSpacing: '0.12em' }}>
              {config.site_name}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Link to="/" style={navLinkStyle(location.pathname === '/')}>Accueil</Link>
            <Link to="/contact" style={navLinkStyle(location.pathname === '/contact')}>Contact</Link>
            {isAuthenticated && isAdmin && (
              <Link to="/admin" style={navLinkStyle(false)}>Admin</Link>
            )}
            {isAuthenticated ? (
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: headerDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 20, lineHeight: 1, padding: 0 }}>
                ×
              </button>
            ) : (
              <div ref={googleBtnRef} style={{ display: 'flex', alignItems: 'center' }} />
            )}
          </nav>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}
            aria-label="Menu"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: 22,
                  height: 1.5,
                  background: headerDark ? '#fff' : '#111',
                  transition: 'transform 0.3s, opacity 0.3s',
                  transform: menuOpen
                    ? i === 0 ? 'translateY(6.5px) rotate(45deg)' : i === 2 ? 'translateY(-6.5px) rotate(-45deg)' : 'none'
                    : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        )}
      </header>

      {/* Mobile menu overlay */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(8,8,8,0.97)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            transition: 'opacity 0.3s, visibility 0.3s',
            opacity: menuOpen ? 1 : 0,
            visibility: menuOpen ? 'visible' : 'hidden',
          }}
        >
          {[
            { to: '/', label: 'Accueil' },
            { to: '/contact', label: 'Contact' },
            ...(isAuthenticated && isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              style={{ color: '#fff', textDecoration: 'none', fontSize: 28, fontWeight: 300, letterSpacing: '0.12em' }}
              className="pg-heading"
            >
              {label}
            </Link>
          ))}

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '10px 28px', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 16, fontFamily: 'Inter, sans-serif' }}
            >
              Se déconnecter
            </button>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div ref={googleBtnRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <main>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: '#141414', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: isMobile ? '48px 24px 32px' : '52px 48px 32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40 }}>
          <div style={{ maxWidth: 280 }}>
            <span className="pg-heading" style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
              {config.site_name}
            </span>
            {config.site_description && (
              <div
                dangerouslySetInnerHTML={{ __html: config.site_description }}
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 300, lineHeight: 1.65, margin: 0 }}
                className="pg-rich-text"
              />
            )}
          </div>

          <div>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Inter, sans-serif' }}>Navigation</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/" className="pg-nav-link" style={{ fontSize: 12 }}>Accueil</Link>
              <Link to="/contact" className="pg-nav-link" style={{ fontSize: 12 }}>Contact</Link>
            </nav>
          </div>

          {(config.social_instagram || config.social_facebook || config.social_pinterest || config.social_website) && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Inter, sans-serif' }}>Réseaux</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {config.social_instagram && <a href={ensureUrl(config.social_instagram)} target="_blank" rel="noopener noreferrer" className="pg-nav-link" style={{ fontSize: 12 }}>Instagram</a>}
                {config.social_facebook && <a href={ensureUrl(config.social_facebook)} target="_blank" rel="noopener noreferrer" className="pg-nav-link" style={{ fontSize: 12 }}>Facebook</a>}
                {config.social_pinterest && <a href={ensureUrl(config.social_pinterest)} target="_blank" rel="noopener noreferrer" className="pg-nav-link" style={{ fontSize: 12 }}>Pinterest</a>}
                {config.social_website && <a href={ensureUrl(config.social_website)} target="_blank" rel="noopener noreferrer" className="pg-nav-link" style={{ fontSize: 12 }}>Site web</a>}
              </div>
            </div>
          )}

          {config.contact_email && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Inter, sans-serif' }}>Contact</p>
              <a href={`mailto:${config.contact_email}`} className="pg-nav-link" style={{ fontSize: 12 }}>{config.contact_email}</a>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: isMobile ? '16px 24px' : '16px 48px' }}>
          <div
            dangerouslySetInnerHTML={{ __html: config.footer_text }}
            style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
            className="pg-rich-text"
          />
        </div>
      </footer>
    </div>
  );
}
