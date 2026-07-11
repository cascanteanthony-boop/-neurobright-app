import { useTranslation } from './lib/i18n';

interface WelcomeProps {
  onRegister: () => void;
  onLogin: () => void;
}

export default function WelcomeScreen({ onRegister, onLogin }: WelcomeProps) {
  const { t } = useTranslation();
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
    </main>
  );
}
