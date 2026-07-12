import { useState } from 'react';
import type { UserMetadata } from './types';
import ActivityScreen, { type ActivityInfo } from './ActivityScreen';
import { supabase } from './lib/supabase';
import { useTranslation, LanguageSwitcher } from './lib/i18n';

type Tab = 'inicio' | 'perfil' | 'actividades' | 'progreso' | 'cuenta';

interface NavShellProps {
  onSignOut: () => void;
  userMetadata: UserMetadata;
}

type Category = 'Todas' | 'Atención' | 'Calma' | 'Sensorial' | 'Emociones' | 'Aprendizaje';

const categories: Category[] = ['Todas', 'Atención', 'Calma', 'Sensorial', 'Emociones', 'Aprendizaje'];

// Etiquetas del pie de enlaces legales (se muestran en el idioma elegido).
// Las páginas viven en la carpeta public: /terms.html, /privacy.html, /refunds.html
const LEGAL_LABELS: Record<string, { terms: string; privacy: string; refunds: string }> = {
  es: { terms: 'Términos', privacy: 'Privacidad', refunds: 'Reembolsos' },
  en: { terms: 'Terms', privacy: 'Privacy', refunds: 'Refunds' },
  pt: { terms: 'Termos', privacy: 'Privacidade', refunds: 'Reembolsos' }
};

const activitiesData = [
  { id: 'breathing', icon: '🌬️', title: 'Respiración 4-7-8', duration: 5, difficulty: 2, category: 'Calma', color: '#4ECDC4', description: 'Guía de respiración para relajar y centrar.' },
  { id: 'memory', icon: '🧠', title: 'Juego de memoria', duration: 12, difficulty: 3, category: 'Atención', color: '#6C63FF', description: 'Ejercicio divertido para fortalecer la concentración.' },
  { id: 'sensory', icon: '🧩', title: 'Rompecabezas sensorial', duration: 15, difficulty: 3, category: 'Sensorial', color: '#FFD166', description: 'Actividad táctil para estimular los sentidos.' },
  { id: 'emotions', icon: '📝', title: 'Diario de emociones', duration: 10, difficulty: 2, category: 'Emociones', color: '#FF8DAA', description: 'Registra sensaciones y reflexiona con calma.' },
  { id: 'reading', icon: '📚', title: 'Lectura guiada', duration: 14, difficulty: 2, category: 'Aprendizaje', color: '#6C63FF', description: 'Tiempo de lectura con preguntas de comprensión.' },
  { id: 'movement', icon: '🤸', title: 'Tiempo de movimiento', duration: 8, difficulty: 1, category: 'Calma', color: '#4ECDC4', description: 'Pequeños ejercicios para descargar energía positiva.' }
]

const tabLabels: Record<Tab, string> = {
  inicio: 'Inicio',
  perfil: 'Perfil',
  actividades: 'Actividades',
  progreso: 'Progreso',
  cuenta: 'Cuenta'
};

interface Completion { title: string; category: string; date: string; }
interface EmotionEntry { emotion: string; label: string; intensity: number; date: string; }

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Racha: días consecutivos (terminando hoy o ayer) con al menos una actividad
function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }));
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.getTime())) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
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
  const { t, lang } = useTranslation();
  const [showLangPanel, setShowLangPanel] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityInfo | null>(null);
  const [activityFilter, setActivityFilter] = useState<Category>('Todas');
  const [completions, setCompletions] = useState<Completion[]>(
    () => ((userMetadata as any).completedActivities as Completion[]) ?? []
  );
  const [emotionLog, setEmotionLog] = useState<EmotionEntry[]>(
    () => ((userMetadata as any).emotionLog as EmotionEntry[]) ?? []
  );

  // Guarda ambos registros juntos para que uno no sobrescriba al otro
  const persistData = async (nextCompletions: Completion[], nextEmotions: EmotionEntry[]) => {
    try {
      await supabase.auth.updateUser({
        data: { ...userMetadata, completedActivities: nextCompletions, emotionLog: nextEmotions }
      });
    } catch (err) {
      console.error('No se pudo guardar', err);
    }
  };

  const handleActivityComplete = async (activity: ActivityInfo) => {
    const entry: Completion = { title: activity.title, category: activity.category, date: new Date().toISOString() };
    const updated = [...completions, entry];
    setCompletions(updated);
    await persistData(updated, emotionLog);
  };

  const handleEmotionLog = async (entry: EmotionEntry) => {
    const updated = [...emotionLog, entry];
    setEmotionLog(updated);
    await persistData(completions, updated);
  };

  const childName = userMetadata.childName ?? 'tu hijo/a';
  const parentName = userMetadata.parentName ?? 'Cuenta familiar';
  const parentEmail = userMetadata.parentEmail ?? 'Correo no registrado';
  const childAge = userMetadata.childAge ?? undefined;
  const childProfile = userMetadata.childProfile ?? 'Perfil en evaluación';
  const today = new Date();
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR' };
  const formattedDate = today.toLocaleDateString(localeMap[lang] ?? 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const profileAnswers = (userMetadata.questionnaireAnswers ?? {}) as Record<string, number>;
  const profileAreaValues = [
    { label: t('area.attention'), value: (profileAnswers.attention ?? 0) * 20 },
    { label: t('area.behavior'), value: (profileAnswers.behavior ?? 0) * 20 },
    { label: t('area.communication'), value: (profileAnswers.communication ?? 0) * 20 },
    { label: t('area.sensory'), value: (profileAnswers.sensory ?? 0) * 20 },
    { label: t('area.emotions'), value: (profileAnswers.emotions ?? 0) * 20 },
    { label: t('area.learning'), value: (profileAnswers.learning ?? 0) * 20 }
  ];

  const strengths = [t('profile.strength1'), t('profile.strength2'), t('profile.strength3')];
  const supportAreas = [t('profile.support1'), t('profile.support2'), t('profile.support3')];

  const dashboardObjective = childProfile.includes('Atención')
    ? t('objective.focus')
    : childProfile.includes('Emociones')
    ? t('objective.emotion')
    : t('objective.unique');

  const filteredActivities =
    activityFilter === 'Todas' ? activitiesData : activitiesData.filter((activity) => activity.category === activityFilter);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const childInitial = childName.trim().charAt(0).toUpperCase() || 'H';

  const weekStart = startOfWeek(new Date());
  const completedThisWeek = completions.filter((c) => new Date(c.date) >= weekStart);
  const weeklyGoal = 7;
  const progressPct = Math.min(Math.round((completedThisWeek.length / weeklyGoal) * 100), 100);
  const activeDays = new Set(completedThisWeek.map((c) => (new Date(c.date).getDay() + 6) % 7));

  // Nivel: sube 1 por cada semana PASADA en que se cumplió la meta (derivado del historial)
  const weekCounts: Record<string, number> = {};
  completions.forEach((c) => {
    const ws = startOfWeek(new Date(c.date)).toISOString();
    weekCounts[ws] = (weekCounts[ws] ?? 0) + 1;
  });
  const currentWeekIso = weekStart.toISOString();
  const pastWeeksMetGoal = Object.entries(weekCounts).filter(
    ([ws, count]) => ws !== currentWeekIso && count >= weeklyGoal
  ).length;
  const childLevel = 1 + pastWeeksMetGoal;

  // ---- Datos reales de la pestaña Progreso (según la semana seleccionada) ----
  const selectedWeekStart = new Date(weekStart);
  selectedWeekStart.setDate(selectedWeekStart.getDate() - weekOffset * 7);
  const selectedWeekEnd = new Date(selectedWeekStart);
  selectedWeekEnd.setDate(selectedWeekEnd.getDate() + 7);

  const weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
  completions.forEach((c) => {
    const d = new Date(c.date);
    if (d >= selectedWeekStart && d < selectedWeekEnd) {
      weeklyProgress[(d.getDay() + 6) % 7]++;
    }
  });
  const totalActivities = weeklyProgress.reduce((sum, value) => sum + value, 0);
  const maxCount = Math.max(1, ...weeklyProgress);

  const prevWeekStart = new Date(selectedWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevTotal = completions.filter((c) => {
    const d = new Date(c.date);
    return d >= prevWeekStart && d < selectedWeekStart;
  }).length;
  let improvementLabel: string;
  if (prevTotal === 0) {
    improvementLabel = totalActivities > 0 ? t('improve.first') : t('improve.none');
  } else {
    const pct = Math.round(((totalActivities - prevTotal) / prevTotal) * 100);
    improvementLabel = `${pct >= 0 ? '+' : ''}${pct}% ${t('improve.vsPrev')}`;
  }

  const streak = computeStreak(completions.map((c) => c.date));
  const weekLabel = weekOffset === 0 ? t('week.current') : t('week.previous', { n: weekOffset });

  const totalAllTime = completions.length;
  const weekMetGoalEver = Object.values(weekCounts).some((count) => count >= weeklyGoal);
  const badges = [
    { emoji: '🌱', label: t('badge.first'), unlocked: totalAllTime >= 1 },
    { emoji: '🔥', label: t('badge.streak3'), unlocked: streak >= 3 },
    { emoji: '⭐', label: t('badge.streak5'), unlocked: streak >= 5 },
    { emoji: '🎯', label: t('badge.act10'), unlocked: totalAllTime >= 10 },
    { emoji: '🏅', label: t('badge.weekComplete'), unlocked: weekMetGoalEver },
    { emoji: '🏆', label: t('badge.act25'), unlocked: totalAllTime >= 25 }
  ];

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
          <p className="dashboard-greeting">{t('home.greeting', { name: childName })}</p>
          <h1>
            {activeTab === 'actividades' ? t('home.todayActivities') : activeTab === 'progreso' ? t('home.progressOf', { name: childName }) : t('home.heroTitle')}
          </h1>
          {activeTab === 'actividades' && <p className="page-date">{formattedDate}</p>}
          {activeTab === 'progreso' && <p className="page-date">{weekLabel}</p>}
        </div>
        <button className="secondary-button signout-button" onClick={onSignOut}>{t('common.signOut')}</button>
      </div>

      {activeTab === 'actividades' ? (
        <section className="activities-screen">
          <div className="chip-row" role="tablist" aria-label="Filtros de actividad">
            {categories.map((category) => (
              <button key={category} type="button" className={activityFilter === category ? 'chip chip-selected' : 'chip'} onClick={() => setActivityFilter(category)}>
                {t(`cat.${category}`)}
              </button>
            ))}
          </div>
          <div className="activities-grid">
            {filteredActivities.map((activity) => (
              <article key={activity.id} className="activity-card">
                <div className="activity-card-icon" style={{ backgroundColor: `${activity.color}22`, color: activity.color }}>{activity.icon}</div>
                <div className="activity-card-body">
                  <div className="activity-card-header">
                    <h2>{t(`act.title.${activity.id}`)}</h2>
                    <span className="activity-category" style={{ backgroundColor: activity.color }}>{t(`cat.${activity.category}`)}</span>
                  </div>
                  <p>{t(`act.desc.${activity.id}`)}</p>
                  <div className="activity-card-meta">
                    <span>{activity.duration} min</span>
                    <span className="difficulty-stars">
                      {Array.from({ length: 3 }, (_, index) => (
                        <span key={index} className={index < activity.difficulty ? 'star active' : 'star'}>★</span>
                      ))}
                    </span>
                  </div>
                </div>
                <button className="start-button" onClick={() => setActiveActivity(activity)}>{t('activities.start')}</button>
              </article>
            ))}
          </div>
        </section>
      ) : activeTab === 'progreso' ? (
        <section className="progress-screen">
          <div className="week-selector-row">
            <button type="button" className="week-button" onClick={() => setWeekOffset((offset) => offset + 1)}>‹</button>
            <div>
              <p className="eyebrow">{t('progress.week')}</p>
              <strong>{weekLabel}</strong>
            </div>
            <button type="button" className="week-button" onClick={() => setWeekOffset((offset) => Math.max(0, offset - 1))} disabled={weekOffset === 0}>›</button>
          </div>
          <section className="bar-chart-card">
            <div className="section-header"><div><p className="eyebrow">{t('progress.weeklyChart')}</p><h2>{t('progress.completedActivities')}</h2></div></div>
            <div className="bar-chart">
              {weeklyProgress.map((value, index) => (
                <div key={index} className="bar-column">
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6C63FF', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                  <div className="bar-fill" style={{ height: `${(value / maxCount) * 100}%` }} title={`${value} actividad${value === 1 ? '' : 'es'}`} />
                  <span>{weekDays[index]}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="summary-grid">
            <article className="summary-card"><p className="summary-label">{t('progress.totalWeek')}</p><strong>{totalActivities} {t('progress.activities')}</strong></article>
            <article className="summary-card"><p className="summary-label">{t('progress.streak')}</p><strong>🔥 {streak} {t('progress.daysStreak')}</strong></article>
            <article className="summary-card"><p className="summary-label">{t('progress.improvement')}</p><strong>{improvementLabel}</strong></article>
          </section>
          <section className="badges-section">
            <div className="section-header"><div><p className="eyebrow">{t('progress.achievements')}</p><h2>{t('progress.medals')}</h2></div></div>
            <div className="badge-grid">
              {badges.map((b, i) => (
                <div
                  key={b.label}
                  className={`badge-card ${['badge-purple', 'badge-green', 'badge-yellow'][i % 3]}`}
                  style={b.unlocked ? undefined : { opacity: 0.4, filter: 'grayscale(1)' }}
                >
                  <span>{b.unlocked ? b.emoji : '🔒'}</span><strong>{b.label}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="notes-section">
            <div className="section-header"><div><p className="eyebrow">{t('progress.notes')}</p><h2>{t('progress.observations')}</h2></div></div>
            <textarea className="notes-field" placeholder={t('progress.notesPlaceholder')} />
          </section>
        </section>
      ) : activeTab === 'perfil' ? (
        <section className="profile-screen">
          <div className="profile-header">
            <div className="profile-avatar">{childInitial}</div>
            <div>
              <h2>{childName}</h2>
              <p className="profile-meta">{childAge ? `${childAge} ${t('common.years')}` : t('profile.ageUnknown')}</p>
              <span className="condition-badge">{childProfile}</span>
            </div>
          </div>
          <section className="neurocard">
            <div className="card-header"><div><p className="eyebrow">{t('profile.neuroProfile')}</p><h2>{t('profile.questionnaireResults')}</h2></div></div>
            <div className="bar-list">
              {profileAreaValues.map((area) => (
                <div key={area.label} className="bar-row">
                  <span className="bar-label">{area.label}</span>
                  <div className="bar-track"><span className="bar-level" style={{ width: `${area.value}%` }} /></div>
                  <strong>{area.value}%</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="chip-section">
            <div>
              <p className="eyebrow">{t('profile.strengths')}</p>
              <div className="chip-group">{strengths.map((item) => (<span key={item} className="chip chip-green">{item}</span>))}</div>
            </div>
            <div>
              <p className="eyebrow">{t('profile.supportAreas')}</p>
              <div className="chip-group">{supportAreas.map((item) => (<span key={item} className="chip chip-purple">{item}</span>))}</div>
            </div>
          </section>
          <div className="profile-actions">
            <button className="secondary-button">{t('profile.editProfile')}</button>
            <button className="primary-button">{t('profile.shareTherapist')}</button>
          </div>
          <section className="history-section">
            <div className="section-header"><div><p className="eyebrow">{t('profile.history')}</p><h2>{t('profile.recentRecords')}</h2></div></div>
            <ul className="history-list"><li className="history-item"><strong>{t('profile.initialQuestionnaire')}</strong><span>{t('profile.recent')}</span></li></ul>
          </section>
        </section>
      ) : activeTab === 'cuenta' ? (
        <section className="account-screen">
          <div className="account-header">
            <div className="account-avatar">{parentName.trim().charAt(0).toUpperCase()}</div>
            <div><h2>{parentName}</h2><p>{parentEmail}</p></div>
          </div>
          <section className="plan-card plan-free">
            <div className="plan-card-header"><p className="eyebrow">{t('account.planCurrent')}</p><h2>{t('account.planFreeTitle')}</h2></div>
            <ul className="plan-list"><li>{t('account.free1')}</li><li>{t('account.free2')}</li><li>{t('account.free3')}</li><li>{t('account.free4')}</li><li>{t('account.free5')}</li></ul>
          </section>
          <section className="plan-card plan-premium">
            <div className="plan-card-header"><p className="eyebrow">{t('account.familyEyebrow')}</p><h2>{t('account.familyPrice')}</h2><p className="plan-subtitle">{t('account.familySubtitle')}</p></div>
            <ul className="plan-list"><li>{t('account.premium1')}</li><li>{t('account.premium2')}</li><li>{t('account.premium3')}</li><li>{t('account.premium4')}</li><li>{t('account.premium5')}</li></ul>
            <button className="primary-button upgrade-button">{t('account.upgradeFamily')}</button>
          </section>
          <section className="settings-section">
            <div className="section-header"><div><p className="eyebrow">{t('account.settingsEyebrow')}</p><h2>{t('account.quickSettings')}</h2></div></div>
            <div className="setting-item">{t('account.notifications')}</div>
            <button
              type="button"
              className="setting-item"
              onClick={() => setShowLangPanel((value) => !value)}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit' }}
            >
              {t('account.language')}
              <span style={{ float: 'right' }}>{showLangPanel ? '▲' : '▼'}</span>
            </button>
            {showLangPanel && (
              <div style={{ padding: '12px 4px' }}>
                <LanguageSwitcher />
              </div>
            )}
            <div className="setting-item">{t('account.privacy')}</div>
          </section>
          <section className="share-section"><button className="secondary-button share-button"><span>🔗</span> {t('account.share')}</button></section>
          <button className="signout-red-button" onClick={onSignOut}>{t('common.signOut')}</button>
          <footer className="legal-footer">
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">{(LEGAL_LABELS[lang] ?? LEGAL_LABELS.es).terms}</a>
            <span aria-hidden="true"> · </span>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">{(LEGAL_LABELS[lang] ?? LEGAL_LABELS.es).privacy}</a>
            <span aria-hidden="true"> · </span>
            <a href="/refunds.html" target="_blank" rel="noopener noreferrer">{(LEGAL_LABELS[lang] ?? LEGAL_LABELS.es).refunds}</a>
            <style>{`.legal-footer{margin-top:18px;margin-bottom:4px;text-align:center;font-size:13px;color:#94a3b8}.legal-footer a{color:#7c3aed;text-decoration:none;margin:0 2px}.legal-footer a:hover{text-decoration:underline}`}</style>
          </footer>
        </section>
      ) : (
        <>
          <section className="profile-card">
            <div className="profile-row">
              <div className="avatar-circle">{childInitial}</div>
              <div>
                <p className="profile-label">{t('home.childProfile')}</p>
                <h2>{childName}{childAge ? `, ${childAge} ${t('common.years')}` : ''}</h2>
                <p className="profile-condition">{childProfile ? `${t('home.detectedProfile')}: ${childProfile}` : t('home.profileEvaluating')}</p>
              </div>
            </div>
            <div className="profile-stats">
              <div><span>{t('home.age')}</span><strong>{childAge ?? '-'}</strong></div>
              <div><span>{t('home.profile')}</span><strong>{childProfile || t('common.notAvailable')}</strong></div>
              <div><span>{t('home.objective')}</span><strong>{dashboardObjective}</strong></div>
            </div>
          </section>

          <section className="activity-section">
            <div className="section-header"><div><p className="eyebrow">{t('home.recommended')}</p><h2>{t('home.whatToDo')}</h2></div></div>
            <div className="activity-list">
              {recommended.length === 0 ? (
                <p style={{ color: '#6b6b85' }}>{t('home.allDone')}</p>
              ) : (
                recommended.map((activity) => (
                  <button key={activity.id} className="activity-item" onClick={() => setActiveActivity(activity)} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                    <div className="activity-icon">{activity.icon}</div>
                    <div><strong>{t(`act.title.${activity.id}`)}</strong><p>{t(`act.desc.${activity.id}`)}</p></div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="progress-section">
            <div className="section-header"><div><p className="eyebrow">{t('home.weeklyProgress')}</p><h2>{t('home.currentProgress')}</h2></div></div>
            <div className="progress-card">
              <div className="progress-label-row">
                <span>{progressPct}% {t('home.completed')}</span>
                <strong>{completedThisWeek.length}/{weeklyGoal} {t('home.goals')}</strong>
              </div>
              <div className="progress-bar">
                <span className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-days">
                {weekDays.map((d, i) => (
                  <span key={i} style={activeDays.has(i) ? { color: '#6C63FF', fontWeight: 700 } : undefined}>{d}</span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}


      {activeActivity && (
        <ActivityScreen
          activity={activeActivity}
          childAge={childAge}
          childLevel={childLevel}
          onClose={() => setActiveActivity(null)}
          onComplete={handleActivityComplete}
          onEmotionLog={handleEmotionLog}
        />
      )}

      <nav className="bottom-nav" aria-label="Barra de navegación">
        {(Object.keys(tabLabels) as Tab[]).map((tab) => (
          <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(tab)}>
            <span className="nav-icon">{tab === 'inicio' ? '🏠' : tab === 'perfil' ? '👤' : tab === 'actividades' ? '🗂️' : tab === 'progreso' ? '📊' : '⚙️'}</span>
            <span>{t(`nav.${tab}`)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
