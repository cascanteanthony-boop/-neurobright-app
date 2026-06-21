import { useState } from 'react';
import type { UserMetadata } from './types';
import ActivityScreen, { type ActivityInfo } from './ActivityScreen';
import { supabase } from './lib/supabase';

type Tab = 'inicio' | 'perfil' | 'actividades' | 'progreso' | 'cuenta';

interface NavShellProps {
  onSignOut: () => void;
  userMetadata: UserMetadata;
}

type Category = 'Todas' | 'Atención' | 'Calma' | 'Sensorial' | 'Emociones' | 'Aprendizaje';

const categories: Category[] = ['Todas', 'Atención', 'Calma', 'Sensorial', 'Emociones', 'Aprendizaje'];

const activitiesData = [
  { icon: '🌬️', title: 'Respiración 4-7-8', duration: 5, difficulty: 2, category: 'Calma', color: '#4ECDC4', description: 'Guía de respiración para relajar y centrar.' },
  { icon: '🧠', title: 'Juego de memoria', duration: 12, difficulty: 3, category: 'Atención', color: '#6C63FF', description: 'Ejercicio divertido para fortalecer la concentración.' },
  { icon: '🧩', title: 'Rompecabezas sensorial', duration: 15, difficulty: 3, category: 'Sensorial', color: '#FFD166', description: 'Actividad táctil para estimular los sentidos.' },
  { icon: '📝', title: 'Diario de emociones', duration: 10, difficulty: 2, category: 'Emociones', color: '#FF8DAA', description: 'Registra sensaciones y reflexiona con calma.' },
  { icon: '📚', title: 'Lectura guiada', duration: 14, difficulty: 2, category: 'Aprendizaje', color: '#6C63FF', description: 'Tiempo de lectura con preguntas de comprensión.' },
  { icon: '🤸', title: 'Tiempo de movimiento', duration: 8, difficulty: 1, category: 'Calma', color: '#4ECDC4', description: 'Pequeños ejercicios para descargar energía positiva.' }
];

const tabLabels: Record<Tab, string> = {
  inicio: 'Inicio',
  perfil: 'Perfil',
  actividades: 'Actividades',
  progreso: 'Progreso',
  cuenta: 'Cuenta'
};

interface Completion { title: string; category: string; date: string; }

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function priorityCategory(profile: string): string | null {
  const p = profile.toLowerCase();
  if (p.includes('tdah') || p.includes('atenci')) return 'Atención';
  if (p.includes('sensorial')) return 'Sensorial';
  if (p.includes('ansiedad')) return 'Calma';
  if (p.includes('tea')) return 'Emociones';
  return null;
}

export default function NavShell({ onSignOut, userMetadata }: NavShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activeActivity, setActiveActivity] = useState<ActivityInfo | null>(null);
  const [activityFilter, setActivityFilter] = useState<Category>('Todas');
  const [completions, setCompletions] = useState<Completion[]>(
    () => ((userMetadata as any).completedActivities as Completion[]) ?? []
  );

  const handleActivityComplete = async (activity: ActivityInfo) => {
    const entry: Completion = { title: activity.title, category: activity.category, date: new Date().toISOString() };
    const updated = [...completions, entry];
    setCompletions(updated);
    try {
      await supabase.auth.updateUser({ data: { ...userMetadata, completedActivities: updated } });
    } catch (err) {
      console.error('No se pudo guardar el progreso', err);
    }
  };

  const childName = userMetadata.childName ?? 'tu hijo/a';
  const parentName = userMetadata.parentName ?? 'Cuenta familiar';
  const parentEmail = userMetadata.parentEmail ?? 'Correo no registrado';
  const childAge = userMetadata.childAge ?? undefined;
  const childProfile = userMetadata.childProfile ?? 'Perfil en evaluación';
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

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
    activityFilter === 'Todas' ? activitiesData : activitiesData.filter((activity) => activity.category === activityFilter);

  const [weekOffset, setWeekOffset] = useState(0);
  const weeklyProgress = [3, 5, 4, 6, 2, 1, 0];
  const totalActivities = weeklyProgress.reduce((sum, value) => sum + value, 0);
  const streak = 4;
  const improvement = 18;
  const weekLabel = weekOffset === 0 ? 'Semana actual' : `Semana -${weekOffset}`;
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const childInitial = childName.trim().charAt(0).toUpperCase() || 'H';

  // Progreso real (semana actual)
  const weekStart = startOfWeek(new Date());
  const completedThisWeek = completions.filter((c) => new Date(c.date) >= weekStart);
  const weeklyGoal = 7;
  const progressPct = Math.min(Math.round((completedThisWeek.length / weeklyGoal) * 100), 100);
  const activeDays = new Set(completedThisWeek.map((c) => (new Date(c.date).getDay() + 6) % 7));

  // Recomendaciones (según el perfil, sin repetir las de hoy)
  const todayStr = new Date().toDateString();
  const doneTodayTitles = new Set(
    completions.filter((c) => new Date(c.date).toDateString() === todayStr).map((c) => c.title)
  );
  const pri = priorityCategory(childProfile);
  const recommended = [...activitiesData]
    .filter((a) => !doneTodayTitles.has(a.title))
    .sort((a, b) => {
      const ap = pri && a.category === pri ? 0 : 1;
      const bp = pri && b.category === pri ? 0 : 1;
      return ap - bp;
    })
    .slice(0, 3);

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-greeting">Hola, aquí el resumen de {childName}</p>
          <h1>
            {activeTab === 'actividades' ? 'Actividades de hoy' : activeTab === 'progreso' ? `Progreso de ${childName}` : 'Un día lleno de apoyo y pequeños logros'}
          </h1>
          {activeTab === 'actividades' && <p className="page-date">{formattedDate}</p>}
          {activeTab === 'progreso' && <p className="page-date">{weekLabel}</p>}
        </div>
        <button className="secondary-button signout-button" onClick={onSignOut}>Cerrar sesión</button>
      </div>

      {activeTab === 'actividades' ? (
        <section className="activities-screen">
          <div className="chip-row" role="tablist" aria-label="Filtros de actividad">
            {categories.map((category) => (
              <button key={category} type="button" className={activityFilter === category ? 'chip chip-selected' : 'chip'} onClick={() => setActivityFilter(category)}>
                {category}
              </button>
            ))}
          </div>
          <div className="activities-grid">
            {filteredActivities.map((activity) => (
              <article key={activity.title} className="activity-card">
                <div className="activity-card-icon" style={{ backgroundColor: `${activity.color}22`, color: activity.color }}>{activity.icon}</div>
                <div className="activity-card-body">
                  <div className="activity-card-header">
                    <h2>{activity.title}</h2>
                    <span className="activity-category" style={{ backgroundColor: activity.color }}>{activity.category}</span>
                  </div>
                  <p>{activity.description}</p>
                  <div className="activity-card-meta">
                    <span>{activity.duration} min</span>
                    <span className="difficulty-stars">
                      {Array.from({ length: 3 }, (_, index) => (
                        <span key={index} className={index < activity.difficulty ? 'star active' : 'star'}>★</span>
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
        <section