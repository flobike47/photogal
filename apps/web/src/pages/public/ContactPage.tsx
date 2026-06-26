import { useState, useRef } from 'react';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { apiClient } from '../../api/client';

interface FormState {
  name: string;
  email: string;
  message: string;
}

export function ContactPage() {
  const { config } = useSiteConfigStore();
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim()) errs.name = 'Requis';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalide';
    if (!form.message.trim()) errs.message = 'Requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await apiClient.post('/contact', form);
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left: dark info panel ── */}
      <div
        style={{
          width: '40%',
          minWidth: 280,
          background: '#0a0a0a',
          padding: '120px 64px 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 20px', fontFamily: 'Inter, sans-serif' }}>
            Nous écrire
          </p>
          <h1
            className="pg-heading"
            style={{ color: '#fff', fontSize: 'clamp(36px, 4vw, 60px)', fontWeight: 300, margin: '0 0 40px', letterSpacing: '-0.01em', lineHeight: 1.1 }}
          >
            Parlons de votre projet
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: 300, lineHeight: 1.75, margin: '0 0 56px', maxWidth: 320 }}>
            {config.site_description}. Répondons à vos questions et construisons quelque chose ensemble.
          </p>

          {config.contact_email && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'Inter, sans-serif' }}>
                Email
              </p>
              <a
                href={`mailto:${config.contact_email}`}
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2, fontWeight: 300 }}
              >
                {config.contact_email}
              </a>
            </div>
          )}
        </div>

        {/* Bottom decoration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 64 }}>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
            {config.site_name}
          </span>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div
        style={{
          flex: 1,
          background: '#fafafa',
          padding: '120px 80px 80px',
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: '100%', maxWidth: 520 }}>
          {status === 'sent' ? (
            <div className="pg-fade-up">
              <div style={{ width: 48, height: 1, background: '#111', marginBottom: 32 }} />
              <h2 className="pg-heading" style={{ fontSize: 40, fontWeight: 300, margin: '0 0 16px', color: '#111' }}>
                Message envoyé
              </h2>
              <p style={{ color: '#666', fontSize: 16, fontWeight: 300, lineHeight: 1.7, margin: '0 0 40px' }}>
                Merci pour votre message. Nous reviendrons vers vous dans les plus brefs délais.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="pg-btn-ghost"
                style={{ color: '#111', borderColor: 'rgba(0,0,0,0.3)', background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#111'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#111'; }}
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              <div style={{ width: 48, height: 1, background: '#111', marginBottom: 48 }} />

              {/* Name */}
              <div style={{ marginBottom: 40 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                  Nom *
                </label>
                <input
                  className="pg-input"
                  type="text"
                  placeholder="Votre nom"
                  value={form.name}
                  onChange={set('name')}
                  style={errors.name ? { borderBottomColor: '#c00' } : {}}
                />
                {errors.name && <span style={{ color: '#c00', fontSize: 11 }}>{errors.name}</span>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 40 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                  Email *
                </label>
                <input
                  className="pg-input"
                  type="email"
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={set('email')}
                  style={errors.email ? { borderBottomColor: '#c00' } : {}}
                />
                {errors.email && <span style={{ color: '#c00', fontSize: 11 }}>{errors.email}</span>}
              </div>

              {/* Message */}
              <div style={{ marginBottom: 56 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                  Message *
                </label>
                <textarea
                  className="pg-textarea"
                  rows={5}
                  placeholder="Décrivez votre projet..."
                  value={form.message}
                  onChange={set('message')}
                  style={errors.message ? { borderBottomColor: '#c00' } : {}}
                />
                {errors.message && <span style={{ color: '#c00', fontSize: 11 }}>{errors.message}</span>}
              </div>

              {status === 'error' && (
                <p style={{ color: '#c00', fontSize: 13, margin: '0 0 24px' }}>
                  Une erreur est survenue. Veuillez réessayer.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="pg-btn-ghost"
                style={{
                  color: '#111',
                  borderColor: 'rgba(0,0,0,0.3)',
                  background: 'transparent',
                  opacity: status === 'loading' ? 0.5 : 1,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => {
                  if (status !== 'loading') {
                    (e.currentTarget as HTMLElement).style.background = '#111';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#111';
                }}
              >
                {status === 'loading' ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
