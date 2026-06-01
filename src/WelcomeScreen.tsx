interface WelcomeProps {
  onRegister: () => void;
  onLogin: () => void;
}

export default function WelcomeScreen({ onRegister, onLogin }: WelcomeProps) {
  return (
    <main className="welcome-screen">
      <section className="welcome-hero">
        <div className="brand-header">
          <div className="brand-mark">
            <span className="brand-icon">★</span>
          </div>
          <div>
            <p className="hero-brand">NeuroBright</p>
            <p className="hero-subtitle">Descubre y potencia el perfil único de tu hijo/a</p>
          </div>
        </div>

        <div className="hero-copy">
          <h1>Una bienvenida cálida para familias que buscan apoyo con propósito y serenidad.</h1>
          <p>
            Crea un espacio de acompañamiento sencillo, moderno y cercano. NeuroBright ayuda a organizar actividades,
            reforzar el progreso y construir confianza día a día.
          </p>
        </div>

        <div className="welcome-benefits">
          <div className="benefit-card">
            <div className="benefit-icon">👤</div>
            <strong>Perfil personalizado</strong>
            <p>Registra intereses, necesidades y rutinas de tu hijo/a.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📅</div>
            <strong>Actividades diarias</strong>
            <p>Recibe sugerencias adaptadas para cada jornada familiar.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📈</div>
            <strong>Seguimiento de progreso</strong>
            <p>Monitorea logros y avances con claridad y calidez.</p>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="primary-button" onClick={onRegister}>
            Comenzar gratis
          </button>
          <button className="link-button" onClick={onLogin}>
            Ya tengo cuenta
          </button>
        </div>
      </section>
    </main>
  );
}
