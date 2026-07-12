import { useTranslation } from './lib/i18n';

// Enlaces públicos que se muestran en la portada (antes del login).
// Apuntan a las páginas de la carpeta public.
const WELCOME_LINKS: Record<string, { pricing: string; terms: string; privacy: string; refunds: string }> = {
  es: { pricing: 'Ver planes y precios', terms: 'Términos', privacy: 'Privacidad', refunds: 'Reembolsos' },
  en: { pricing: 'View plans & pricing', terms: 'Terms', privacy: 'Privacy', refunds: 'Refunds' },
  pt: { pricing: 'Ver planos e preços', terms: 'Termos', privacy: 'Privacidade', refunds: 'Reembolsos' }
};

interface WelcomeProps {
  onRegister: () => void;
  onLogin: () => void;
}

export default function WelcomeScreen({ onRegister, onLogin }: WelcomeProps) {
  const { t, lang } = useTranslation();
  const links = WELCOME_LINKS[lang] ?? WELCOME_LINKS.es;
  return (
    <main className="welcome-screen">
      <section className="welcome-hero">
        <div className="brand-header">
          <div className="brand-mark">
            <span className="brand-icon">★</span>
          </div>
          <div>
            <p className="hero-brand">NeuroBright</p>
            <p className="hero-subtitle">{t('welcome.heroSubtitle')}</p>
          </div>
        </div>

        <div className="hero-copy">
          <h1>{t('welcome.heroTitle')}</h1>
          <p>{t('welcome.heroBody')}</p>
        </div>

        <div className="welcome-benefits">
          <div className="benefit-card">
            <div className="benefit-icon">👤</div>
            <strong>{t('welcome.benefit1Title')}</strong>
            <p>{t('welcome.benefit1Body')}</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📅</div>
            <strong>{t('welcome.benefit2Title')}</strong>
            <p>{t('welcome.benefit2Body')}</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📈</div>
            <strong>{t('welcome.benefit3Title')}</strong>
            <p>{t('welcome.benefit3Body')}</p>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="primary-button" onClick={onRegister}>
            {t('welcome.startFree')}
          </button>
          <button className="link-button" onClick={onLogin}>
            {t('welcome.haveAccount')}
          </button>
        </div>
      </section>

      <footer className="welcome-legal">
        <a className="welcome-legal-pricing" href="/pricing.html" target="_blank" rel="noopener noreferrer">
          {links.pricing}
        </a>
        <div className="welcome-legal-sub">
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">{links.terms}</a>
          <span aria-hidden="true"> · </span>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">{links.privacy}</a>
          <span aria-hidden="true"> · </span>
          <a href="/refunds.html" target="_blank" rel="noopener noreferrer">{links.refunds}</a>
        </div>
        <style>{`
          .welcome-legal{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:20px;padding-bottom:8px}
          .welcome-legal-pricing{display:inline-block;padding:8px 18px;border-radius:999px;border:2px solid #c4b5fd;color:#6C63FF;font-weight:700;text-decoration:none;font-size:14px;transition:background .12s ease,border-color .12s ease}
          .welcome-legal-pricing:hover{background:#f5f3ff;border-color:#6C63FF}
          .welcome-legal-sub{font-size:13px;color:#94a3b8}
          .welcome-legal-sub a{color:#7c3aed;text-decoration:none;margin:0 2px}
          .welcome-legal-sub a:hover{text-decoration:underline}
        `}</style>
      </footer>
    </main>
  );
}
