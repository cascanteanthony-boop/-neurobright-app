import { useState } from 'react';
import ActivityScreen, { type ActivityInfo } from './ActivityScreen';
import type { UserMetadata } from './types';

type Tab = 'inicio' | 'perfil' | 'actividades' | 'progreso' | 'cuenta';

interface NavShellProps {
  onSignOut: () => void;
  userMetadata: UserMetadata;
}

type Category = 'Todas' | 'Atención' | 'Calma' | 'Sensorial' | 'Emociones' | 'Aprendizaje';

const categories: Category[] = ['Todas', 'Atención', 'Calma', 'Sensorial', 'Emociones', 'Aprendizaje'];

const activitiesData = [
  {
    icon: '🌬️',
    title: 'Respiración 4-7-8',
    duration: 5,
    difficulty: 2,
    category: 'Calma',
    color: '#4ECDC4',
    description: 'Guía de respiración para relajar y centrar.'
  },
  {
    icon: '🧠',
    title: 'Juego de memoria',
    duration: 12,
    difficulty: 3,
    category: 'Atención',
    color: '#6C63FF',
    description: 'Ejercicio divertido para fortalecer la concentración.'
  },
  {
    icon: '🧩',
    title: 'Rompecabezas sensorial',
    duration: 15,
    difficulty: 3,
    category: 'Sensorial',
    color: '#FFD166',
    description: 'Actividad táctil para estimular los sentidos.'
  },
  {
    icon: '📝',
    title: 'Diario de emociones',
    duration: 10,
    difficulty: 2,
    category: 'Emociones',
    color: '#FF8DAA',
    description: 'Registra sensaciones y reflexiona con calma.'
  },
  {
    icon: '📚',
    title: 'Lectura guiada',
    duration: 14,
    difficulty: 2,
    category: 'Aprendizaje',
    color: '#6C63FF',
    description: 'Tiempo de lectura con preguntas de comprensión.'
  },
  {
    icon: '🤸',
    title: 'Tiempo de movimiento',
    duration: 8,
    difficulty: 1,
    category: 'Calma',
    color: '#4ECDC4',
    description: 'Pequeños ejercicios para descargar energía positiva.'
  }
];

const activityItems = [
  {
    icon: '🎨',
    title: 'Taller creativo',
    subtitle: 'Estimula atención y expresión'
  },
  {
    icon: '🧘',
    title: 'Rutina de calma',
    subtitle: 'Respira y regula emociones'
  },
  {
    icon: '🧩',
    title: 'Juego estructurado',
    subtitle: 'Mejora la memoria y enfoque'
  }
];

const tabLabels: Record<Tab, string> = {
  inicio: 'Inicio',
  perfil: 'Perfil',
  actividades: 'Actividades',
  progreso: 'Progreso',
  cuenta: 'Cuenta'
};

export default function NavShell({ onSignOut, userMetadata }: NavShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activeActivity, setActiveActivity] = useState<ActivityInfo | null>(null);
  const [activityFilter, setActivityFilter] = useState<Category>('Todas');
  const childName = userMetadata.childName ?? 'tu hijo/a';
  const parentName = userMetadata.parentName ?? 'Cuenta familiar';
  const parentEmail = userMetadata.parentEmail ?? 'Correo no registrado';
  const childAge = userMetadata.childAge ?? undefined;
  const childProfile = userMetadata.childProfile ?? 'Perfil en evaluación';
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const profileAnswers = userMetadata.questionnaireAnswers ?? {};
  const profileAreaValues = [
    { label: 'Atención', value: (profileAnswers.attention ?? 0) * 20 },
    { label: 'Comportamiento', value: (profileAnswers.behavior ?? 0) * 20 },
    { label: 'Comunicación', value: (profileAnswers.communication ?? 0) * 20 },
    { label: 'Sensorial', value: (profileAnswers.sensory ?? 0) * 20 },
    { label: 'Emociones', value: (profileAnswers.emotions ?? 0) * 20 },
    { label: 'Aprendizaje', value: (profileAnswers.learning ?? 0) * 20 }
  ];

  const strengths = ['Observación consciente', 'Curiosidad natural', 'Pensamiento creativo'];
  const supportAreas = ['Rutinas claras', 'Pausas sensoriales', 'Apoyo emocional'];

  const dashboardObjective = childProfile.includes('Atención')
    ? 'Mejorar foco y organización'
    : childProfile.includes('Emociones')
    ? 'Apoyar la regulación emocional'
    : 'Potenciar sus habilidades únicas';

  const filteredActivities =
    activityFilter === 'Todas'
      ? activitiesData
      : activitiesData.filter((activity) => activity.category === activityFilter);

  const [weekOffset, setWeekOffset] = useState(0);
  const weeklyProgress = [3, 5, 4, 6, 2, 1, 0];
  const totalActivities = weeklyProgress.reduce((sum, value) => sum + value, 0);
  const streak = 4;
  const improvement = 18;
  const weekLabel = weekOffset === 0 ? 'Semana actual' : `Semana -${weekOffset}`;
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const childInitial = childName.trim().charAt(0).toUpperCase() || 'H';

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-greeting">Hola, aquí el resumen de {childName}</p>
          <h1>
            {activeTab === 'actividades'
              ? 'Actividades de hoy'
              : activeTab === 'progreso'
              ? `Progreso de ${childName}`
              : 'Un día lleno de apoyo y pequeños logros'}
          </h1>
          {activeTab === 'actividades' && <p className="page-date">{formattedDate}</p>}
          {activeTab === 'progreso' && <p className="page-date">{weekLabel}</p>}
        </div>
        <button className="secondary-button signout-button" onClick={onSignOut}>
          Cerrar sesión
        </button>
      </div>

      {activeTab === 'actividades' ? (
        <section className="activities-screen">
          <div className="chip-row" role="tablist" aria-label="Filtros de actividad">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={activityFilter === category ? 'chip chip-selected' : 'chip'}
                onClick={() => setActivityFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="activities-grid">
            {filteredActivities.map((activity) => (
              <article key={activity.title} className="activity-card">
                <div className="activity-card-icon" style={{ backgroundColor: `${activity.color}22`, color: activity.color }}>
                  {activity.icon}
                </div>
                <div className="activity-card-body">
                  <div className="activity-card-header">
                    <h2>{activity.title}</h2>
                    <span className="activity-category" style={{ backgroundColor: activity.color }}>
                      {activity.category}
                    </span>
                  </div>
                  <p>{activity.description}</p>
                  <div className="activity-card-meta">
                    <span>{activity.duration} min</span>
                    <span className="difficulty-stars">
                      {Array.from({ length: 3 }, (_, index) => (
                        <span key={index} className={index < activity.difficulty ? 'star active' : 'star'}>
                          ★
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
                <button className="start-button" onClick={() => setActiveActivity(activity)}>Iniciar</button>
              </article>
            ))}
          </div>
        </section>
      ) : activeTab === 'progreso' ? (
        <section className="progress-screen">
          <div className="week-selector-row">
            <button
              type="button"
              className="week-button"
              onClick={() => setWeekOffset((offset) => offset + 1)}
            >
              ‹
            </button>
            <div>
              <p className="eyebrow">Semana</p>
              <strong>{weekLabel}</strong>
            </div>
            <button
              type="button"
              className="week-button"
              onClick={() => setWeekOffset((offset) => Math.max(0, offset - 1))}
              disabled={weekOffset === 0}
            >
              ›
            </button>
          </div>

          <section className="bar-chart-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Gráfica semanal</p>
                <h2>Actividades completadas</h2>
              </div>
            </div>
            <div className="bar-chart">
              {weeklyProgress.map((value, index) => (
                <div key={index} className="bar-column">
                  <div className="bar-fill" style={{ height: `${Math.min(value * 14, 100)}%` }} />
                  <span>{weekDays[index]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="summary-grid">
            <article className="summary-card">
              <p className="summary-label">Total esta semana</p>
              <strong>{totalActivities} actividades</strong>
            </article>
            <article className="summary-card">
              <p className="summary-label">Racha</p>
              <strong>🔥 {streak} días seguidos</strong>
            </article>
            <article className="summary-card">
              <p className="summary-label">Mejora</p>
              <strong>+{improvement}% vs semana anterior</strong>
            </article>
          </section>

          <section className="badges-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Logros desbloqueados</p>
                <h2>Medallas de la semana</h2>
              </div>
            </div>
            <div className="badge-grid">
              <div className="badge-card badge-purple">
                <span>🏅</span>
                <strong>Primera semana</strong>
              </div>
              <div className="badge-card badge-green">
                <span>🔥</span>
                <strong>5 días seguidos</strong>
              </div>
              <div className="badge-card badge-yellow">
                <span>🎯</span>
                <strong>10 actividades</strong>
              </div>
            </div>
          </section>

          <section className="notes-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Notas de la semana</p>
                <h2>Observaciones para la familia</h2>
              </div>
            </div>
            <textarea className="notes-field" placeholder="Escribe aquí cómo fue la semana, qué funcionó mejor o qué quieres recordar..." />
          </section>
        </section>
      ) : activeTab === 'perfil' ? (
        <section className="profile-screen">
          <div className="profile-header">
            <div className="profile-avatar">{childInitial}</div>
            <div>
              <h2>{childName}</h2>
              <p className="profile-meta">{childAge ? `${childAge} años` : 'Edad no registrada'}</p>
              <span className="condition-badge">{childProfile}</span>
            </div>
          </div>

          <section className="neurocard">
            <div className="card-header">
              <div>
                <p className="eyebrow">Perfil neurodivergente</p>
                <h2>Resultados del cuestionario</h2>
              </div>
            </div>
            <div className="bar-list">
              {profileAreaValues.map((area) => (
                <div key={area.label} className="bar-row">
                  <span className="bar-label">{area.label}</span>
                  <div className="bar-track">
                    <span className="bar-level" style={{ width: `${area.value}%` }} />
                  </div>
                  <strong>{area.value}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="chip-section">
            <div>
              <p className="eyebrow">Fortalezas</p>
              <div className="chip-group">
                {strengths.map((item) => (
                  <span key={item} className="chip chip-green">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow">Áreas de apoyo</p>
              <div className="chip-group">
                {supportAreas.map((item) => (
                  <span key={item} className="chip chip-purple">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="profile-actions">
            <button className="secondary-button">Editar perfil</button>
            <button className="primary-button">Compartir con terapeuta</button>
          </div>

          <section className="history-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Historial de evaluaciones</p>
                <h2>Registros recientes</h2>
              </div>
            </div>
            <ul className="history-list">
              <li className="history-item">
                <strong>Cuestionario inicial</strong>
                <span>Reciente</span>
              </li>
            </ul>
          </section>
        </section>
      ) : activeTab === 'cuenta' ? (
        <section className="account-screen">
          <div className="account-header">
            <div className="account-avatar">{parentName.trim().charAt(0).toUpperCase()}</div>
            <div>
              <h2>{parentName}</h2>
              <p>{parentEmail}</p>
            </div>
          </div>

          <section className="plan-card plan-free">
            <div className="plan-card-header">
              <p className="eyebrow">Plan actual</p>
              <h2>Plan Gratuito</h2>
            </div>
            <ul className="plan-list">
              <li>Limitación a 1 perfil</li>
              <li>Acceso básico a actividades</li>
              <li>Sin reportes PDF</li>
              <li>Incluye anuncios suaves</li>
              <li>Soporte estándar</li>
            </ul>
          </section>

          <section className="plan-card plan-premium">
            <div className="plan-card-header">
              <p className="eyebrow">Plan Familiar</p>
              <h2>$14.99/mes</h2>
              <p className="plan-subtitle">o $109/año (ahorra 39%)</p>
            </div>
            <ul className="plan-list">
              <li>Perfiles ilimitados</li>
              <li>Todas las actividades desbloqueadas</li>
              <li>Reportes PDF descargables</li>
              <li>Sin anuncios</li>
              <li>Soporte prioritario</li>
            </ul>
            <button className="primary-button upgrade-button">Actualizar a Plan Familiar</button>
          </section>

          <section className="settings-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Configuración</p>
                <h2>Ajustes rápidos</h2>
              </div>
            </div>
            <div className="setting-item">Notificaciones</div>
            <div className="setting-item">Idioma</div>
            <div className="setting-item">Privacidad</div>
          </section>

          <section className="share-section">
            <button className="secondary-button share-button">
              <span>🔗</span> Compartir NeuroBright
            </button>
          </section>

          <button className="signout-red-button" onClick={onSignOut}>
            Cerrar sesión
          </button>
        </section>
      ) : (
        <>
          <section className="profile-card">
            <div className="profile-row">
              <div className="avatar-circle">{childInitial}</div>
              <div>
                <p className="profile-label">Perfil del hijo/a</p>
                <h2>{childName}{childAge ? `, ${childAge} años` : ''}</h2>
                <p className="profile-condition">{childProfile ? `Perfil detectado: ${childProfile}` : 'Perfil en evaluación'}</p>
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <span>Edad</span>
                <strong>{childAge ?? '-'}</strong>
              </div>
              <div>
                <span>Perfil</span>
                <strong>{childProfile || 'No disponible'}</strong>
              </div>
              <div>
                <span>Objetivo</span>
                <strong>{dashboardObjective}</strong>
              </div>
            </div>
          </section>

          <section className="activity-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Actividad de hoy</p>
                <h2>Sugerencias para acompañar el día</h2>
              </div>
            </div>
            <div className="activity-list">
              {activityItems.map((item) => (
                <div key={item.title} className="activity-item">
                  <div className="activity-icon">{item.icon}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="progress-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Progreso semanal</p>
                <h2>Avance actual</h2>
              </div>
            </div>
           <div className="progress-card">
              <div className="progress-label-row">
                <span>0% cumplido</span>
                <strong>0/7 objetivos</strong>
              </div>
              <div className="progress-bar">
                <span className="progress-fill" style={{ width: '0%' }} />
              </div>
              <div className="progress-days">
                <span>L</span>
                <span>M</span>
                <span>M</span>
                <span>J</span>
                <span>V</span>
                <span>S</span>
                <span>D</span>
              </div>
            </div>
          </section>
        </>
      )}

      {activeActivity && (
        <ActivityScreen
          activity={activeActivity}
          childAge={childAge}
          onClose={() => setActiveActivity(null)}
          onComplete={(a) => console.log('Actividad completada:', a.title)}
        />
      )}

      <button className="fab-button" aria-label="Agregar registro del día">
        +
      </button>
      <nav className="bottom-nav" aria-label="Barra de navegación">
        {Object.entries(tabLabels).map(([tab, label]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab(tab as Tab)}
          >
            <span className="nav-icon">{tab === 'inicio' ? '🏠' : tab === 'perfil' ? '👤' : tab === 'actividades' ? '🗂️' : tab === 'progreso' ? '📊' : '⚙️'}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
