import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// ───────────────────────────────────────────────────────────
// NeuroBright — Motor de traducciones (i18n)
//
// Cómo funciona:
// - Todos los textos viven en el objeto `translations`, organizados
//   por idioma (es / en / pt) y por "llave" (ej. 'nav.inicio').
// - En los componentes se usa el hook useTranslation():
//       const { t, lang, setLang } = useTranslation();
//       <h2>{t('welcome.title')}</h2>
// - Si una llave todavía NO está traducida a un idioma, se muestra
//   en español automáticamente (y si tampoco existe en español,
//   se muestra la llave). Así nada se rompe mientras migramos textos.
// - El idioma elegido se recuerda en el navegador (localStorage).
// ───────────────────────────────────────────────────────────

export type Lang = 'es' | 'en' | 'pt';

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' }
];

type Dict = Record<string, string>;

// Interpolación simple: t('welcome.greeting', { name: 'Emma' })
// con el texto "¡Hola, {name}!"  →  "¡Hola, Emma!"
type Vars = Record<string, string | number>;

const translations: Record<Lang, Dict> = {
  es: {
    'common.appName': 'NeuroBright',
    'common.next': 'Siguiente',
    'common.previous': '← Anterior',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.retry': 'Intentar de nuevo',
    'common.done': 'Listo',
    'common.close': 'Cerrar',
    'common.signOut': 'Cerrar sesión',

    'welcome.title': 'Bienvenido a NeuroBright',
    'welcome.subtitle': 'Apoyo diario para acompañar el desarrollo de tu peque.',
    'welcome.register': 'Crear cuenta',
    'welcome.login': 'Iniciar sesión',

    'nav.inicio': 'Inicio',
    'nav.perfil': 'Perfil',
    'nav.actividades': 'Actividades',
    'nav.progreso': 'Progreso',
    'nav.cuenta': 'Cuenta',

    'account.planCurrent': 'Plan actual',
    'account.planFreeTitle': 'Plan Gratuito',
    'account.free1': 'Limitación a 1 perfil',
    'account.free2': 'Acceso básico a actividades',
    'account.free3': 'Sin reportes PDF',
    'account.free4': 'Incluye anuncios suaves',
    'account.free5': 'Soporte estándar',
    'account.familyEyebrow': 'Plan Familiar',
    'account.familyPrice': '$14.99/mes',
    'account.familySubtitle': 'o $109/año (ahorra 39%)',
    'account.premium1': 'Perfiles ilimitados',
    'account.premium2': 'Todas las actividades desbloqueadas',
    'account.premium3': 'Reportes PDF descargables',
    'account.premium4': 'Sin anuncios',
    'account.premium5': 'Soporte prioritario',
    'account.upgradeFamily': 'Actualizar a Plan Familiar',
    'account.settingsEyebrow': 'Configuración',
    'account.quickSettings': 'Ajustes rápidos',
    'account.notifications': 'Notificaciones',
    'account.language': 'Idioma',
    'account.privacy': 'Privacidad',
    'account.share': 'Compartir NeuroBright',
    'common.years': 'años',
    'common.notAvailable': 'No disponible',
    'home.greeting': 'Hola, aquí el resumen de {name}',
    'home.todayActivities': 'Actividades de hoy',
    'home.progressOf': 'Progreso de {name}',
    'home.heroTitle': 'Un día lleno de apoyo y pequeños logros',
    'home.childProfile': 'Perfil del hijo/a',
    'home.detectedProfile': 'Perfil detectado',
    'home.profileEvaluating': 'Perfil en evaluación',
    'home.age': 'Edad',
    'home.profile': 'Perfil',
    'home.objective': 'Objetivo',
    'home.recommended': 'Recomendado para hoy',
    'home.whatToDo': 'Qué hacer ahora',
    'home.allDone': '¡Completaste las actividades de hoy! 🎉 Vuelve mañana para seguir avanzando.',
    'home.weeklyProgress': 'Progreso semanal',
    'home.currentProgress': 'Avance actual',
    'home.completed': 'cumplido',
    'home.goals': 'objetivos',
    'activities.start': 'Iniciar',
    'cat.Todas': 'Todas',
    'cat.Atención': 'Atención',
    'cat.Calma': 'Calma',
    'cat.Sensorial': 'Sensorial',
    'cat.Emociones': 'Emociones',
    'cat.Aprendizaje': 'Aprendizaje',
    'week.current': 'Semana actual',
    'week.previous': 'Hace {n} sem.',
    'progress.week': 'Semana',
    'progress.weeklyChart': 'Gráfica semanal',
    'progress.completedActivities': 'Actividades completadas',
    'progress.totalWeek': 'Total esta semana',
    'progress.activities': 'actividades',
    'progress.streak': 'Racha',
    'progress.daysStreak': 'días seguidos',
    'progress.improvement': 'Mejora',
    'progress.achievements': 'Logros desbloqueados',
    'progress.medals': 'Medallas de la semana',
    'progress.notes': 'Notas de la semana',
    'progress.observations': 'Observaciones para la familia',
    'progress.notesPlaceholder': 'Escribe aquí cómo fue la semana, qué funcionó mejor o qué quieres recordar...',
    'improve.first': '¡primera semana activa!',
    'improve.none': 'sin datos aún',
    'improve.vsPrev': 'vs semana anterior',
    'objective.focus': 'Mejorar foco y organización',
    'objective.emotion': 'Apoyar la regulación emocional',
    'objective.unique': 'Potenciar sus habilidades únicas',
    'area.attention': 'Atención',
    'area.behavior': 'Comportamiento',
    'area.communication': 'Comunicación',
    'area.sensory': 'Sensorial',
    'area.emotions': 'Emociones',
    'area.learning': 'Aprendizaje',
    'profile.strength1': 'Observación consciente',
    'profile.strength2': 'Curiosidad natural',
    'profile.strength3': 'Pensamiento creativo',
    'profile.support1': 'Rutinas claras',
    'profile.support2': 'Pausas sensoriales',
    'profile.support3': 'Apoyo emocional',
    'profile.ageUnknown': 'Edad no registrada',
    'profile.neuroProfile': 'Perfil neurodivergente',
    'profile.questionnaireResults': 'Resultados del cuestionario',
    'profile.strengths': 'Fortalezas',
    'profile.supportAreas': 'Áreas de apoyo',
    'profile.editProfile': 'Editar perfil',
    'profile.shareTherapist': 'Compartir con terapeuta',
    'profile.history': 'Historial de evaluaciones',
    'profile.recentRecords': 'Registros recientes',
    'profile.initialQuestionnaire': 'Cuestionario inicial',
    'profile.recent': 'Reciente',
    'badge.first': 'Primeros pasos',
    'badge.streak3': '3 días seguidos',
    'badge.streak5': '5 días seguidos',
    'badge.act10': '10 actividades',
    'badge.weekComplete': 'Semana completa',
    'badge.act25': '25 actividades',

    'lang.title': 'Elegí el idioma'
  },

  en: {
    'common.appName': 'NeuroBright',
    'common.next': 'Next',
    'common.previous': '← Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.retry': 'Try again',
    'common.done': 'Done',
    'common.close': 'Close',
    'common.signOut': 'Sign out',

    'welcome.title': 'Welcome to NeuroBright',
    'welcome.subtitle': "Everyday support to nurture your child's development.",
    'welcome.register': 'Create account',
    'welcome.login': 'Sign in',

    'nav.inicio': 'Home',
    'nav.perfil': 'Profile',
    'nav.actividades': 'Activities',
    'nav.progreso': 'Progress',
    'nav.cuenta': 'Account',

    'account.planCurrent': 'Current plan',
    'account.planFreeTitle': 'Free Plan',
    'account.free1': 'Limited to 1 profile',
    'account.free2': 'Basic access to activities',
    'account.free3': 'No PDF reports',
    'account.free4': 'Includes light ads',
    'account.free5': 'Standard support',
    'account.familyEyebrow': 'Family Plan',
    'account.familyPrice': '$14.99/month',
    'account.familySubtitle': 'or $109/year (save 39%)',
    'account.premium1': 'Unlimited profiles',
    'account.premium2': 'All activities unlocked',
    'account.premium3': 'Downloadable PDF reports',
    'account.premium4': 'No ads',
    'account.premium5': 'Priority support',
    'account.upgradeFamily': 'Upgrade to Family Plan',
    'account.settingsEyebrow': 'Settings',
    'account.quickSettings': 'Quick settings',
    'account.notifications': 'Notifications',
    'account.language': 'Language',
    'account.privacy': 'Privacy',
    'account.share': 'Share NeuroBright',
    'common.years': 'years',
    'common.notAvailable': 'Not available',
    'home.greeting': 'Hi, here is the summary for {name}',
    'home.todayActivities': 'Activities for today',
    'home.progressOf': 'Progress for {name}',
    'home.heroTitle': 'A day full of support and small wins',
    'home.childProfile': 'Child profile',
    'home.detectedProfile': 'Detected profile',
    'home.profileEvaluating': 'Profile being evaluated',
    'home.age': 'Age',
    'home.profile': 'Profile',
    'home.objective': 'Goal',
    'home.recommended': 'Recommended for today',
    'home.whatToDo': 'What to do now',
    'home.allDone': 'You are all done for today! 🎉 Come back tomorrow to keep going.',
    'home.weeklyProgress': 'Weekly progress',
    'home.currentProgress': 'Current progress',
    'home.completed': 'completed',
    'home.goals': 'goals',
    'activities.start': 'Start',
    'cat.Todas': 'All',
    'cat.Atención': 'Attention',
    'cat.Calma': 'Calm',
    'cat.Sensorial': 'Sensory',
    'cat.Emociones': 'Emotions',
    'cat.Aprendizaje': 'Learning',
    'week.current': 'Current week',
    'week.previous': '{n} wk. ago',
    'progress.week': 'Week',
    'progress.weeklyChart': 'Weekly chart',
    'progress.completedActivities': 'Completed activities',
    'progress.totalWeek': 'Total this week',
    'progress.activities': 'activities',
    'progress.streak': 'Streak',
    'progress.daysStreak': 'days in a row',
    'progress.improvement': 'Improvement',
    'progress.achievements': 'Achievements unlocked',
    'progress.medals': 'Medals of the week',
    'progress.notes': 'Notes of the week',
    'progress.observations': 'Notes for the family',
    'progress.notesPlaceholder': 'Write here how the week went, what worked best, or what you want to remember...',
    'improve.first': 'first active week!',
    'improve.none': 'no data yet',
    'improve.vsPrev': 'vs last week',
    'objective.focus': 'Improve focus and organization',
    'objective.emotion': 'Support emotional regulation',
    'objective.unique': 'Boost their unique strengths',
    'area.attention': 'Attention',
    'area.behavior': 'Behavior',
    'area.communication': 'Communication',
    'area.sensory': 'Sensory',
    'area.emotions': 'Emotions',
    'area.learning': 'Learning',
    'profile.strength1': 'Mindful observation',
    'profile.strength2': 'Natural curiosity',
    'profile.strength3': 'Creative thinking',
    'profile.support1': 'Clear routines',
    'profile.support2': 'Sensory breaks',
    'profile.support3': 'Emotional support',
    'profile.ageUnknown': 'Age not set',
    'profile.neuroProfile': 'Neurodivergent profile',
    'profile.questionnaireResults': 'Questionnaire results',
    'profile.strengths': 'Strengths',
    'profile.supportAreas': 'Support areas',
    'profile.editProfile': 'Edit profile',
    'profile.shareTherapist': 'Share with therapist',
    'profile.history': 'Assessment history',
    'profile.recentRecords': 'Recent records',
    'profile.initialQuestionnaire': 'Initial questionnaire',
    'profile.recent': 'Recent',
    'badge.first': 'First steps',
    'badge.streak3': '3 days in a row',
    'badge.streak5': '5 days in a row',
    'badge.act10': '10 activities',
    'badge.weekComplete': 'Full week',
    'badge.act25': '25 activities',

    'lang.title': 'Choose your language'
  },

  pt: {
    'common.appName': 'NeuroBright',
    'common.next': 'Próximo',
    'common.previous': '← Voltar',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Carregando...',
    'common.retry': 'Tentar de novo',
    'common.done': 'Pronto',
    'common.close': 'Fechar',
    'common.signOut': 'Sair',

    'welcome.title': 'Bem-vindo ao NeuroBright',
    'welcome.subtitle': 'Apoio diário para acompanhar o desenvolvimento do seu filho.',
    'welcome.register': 'Criar conta',
    'welcome.login': 'Entrar',

    'nav.inicio': 'Início',
    'nav.perfil': 'Perfil',
    'nav.actividades': 'Atividades',
    'nav.progreso': 'Progresso',
    'nav.cuenta': 'Conta',

    'account.planCurrent': 'Plano atual',
    'account.planFreeTitle': 'Plano Gratuito',
    'account.free1': 'Limitado a 1 perfil',
    'account.free2': 'Acesso básico às atividades',
    'account.free3': 'Sem relatórios PDF',
    'account.free4': 'Inclui anúncios leves',
    'account.free5': 'Suporte padrão',
    'account.familyEyebrow': 'Plano Familiar',
    'account.familyPrice': '$14,99/mês',
    'account.familySubtitle': 'ou $109/ano (economize 39%)',
    'account.premium1': 'Perfis ilimitados',
    'account.premium2': 'Todas as atividades desbloqueadas',
    'account.premium3': 'Relatórios PDF para baixar',
    'account.premium4': 'Sem anúncios',
    'account.premium5': 'Suporte prioritário',
    'account.upgradeFamily': 'Assinar o Plano Familiar',
    'account.settingsEyebrow': 'Configurações',
    'account.quickSettings': 'Ajustes rápidos',
    'account.notifications': 'Notificações',
    'account.language': 'Idioma',
    'account.privacy': 'Privacidade',
    'account.share': 'Compartilhar NeuroBright',
    'common.years': 'anos',
    'common.notAvailable': 'Indisponível',
    'home.greeting': 'Olá, aqui está o resumo de {name}',
    'home.todayActivities': 'Atividades de hoje',
    'home.progressOf': 'Progresso de {name}',
    'home.heroTitle': 'Um dia cheio de apoio e pequenas conquistas',
    'home.childProfile': 'Perfil da criança',
    'home.detectedProfile': 'Perfil detectado',
    'home.profileEvaluating': 'Perfil em avaliação',
    'home.age': 'Idade',
    'home.profile': 'Perfil',
    'home.objective': 'Objetivo',
    'home.recommended': 'Recomendado para hoje',
    'home.whatToDo': 'O que fazer agora',
    'home.allDone': 'Você concluiu as atividades de hoje! 🎉 Volte amanhã para continuar.',
    'home.weeklyProgress': 'Progresso semanal',
    'home.currentProgress': 'Progresso atual',
    'home.completed': 'concluído',
    'home.goals': 'objetivos',
    'activities.start': 'Iniciar',
    'cat.Todas': 'Todas',
    'cat.Atención': 'Atenção',
    'cat.Calma': 'Calma',
    'cat.Sensorial': 'Sensorial',
    'cat.Emociones': 'Emoções',
    'cat.Aprendizaje': 'Aprendizagem',
    'week.current': 'Semana atual',
    'week.previous': 'Há {n} sem.',
    'progress.week': 'Semana',
    'progress.weeklyChart': 'Gráfico semanal',
    'progress.completedActivities': 'Atividades concluídas',
    'progress.totalWeek': 'Total esta semana',
    'progress.activities': 'atividades',
    'progress.streak': 'Sequência',
    'progress.daysStreak': 'dias seguidos',
    'progress.improvement': 'Melhora',
    'progress.achievements': 'Conquistas desbloqueadas',
    'progress.medals': 'Medalhas da semana',
    'progress.notes': 'Notas da semana',
    'progress.observations': 'Observações para a família',
    'progress.notesPlaceholder': 'Escreva aqui como foi a semana, o que funcionou melhor ou o que quer lembrar...',
    'improve.first': 'primeira semana ativa!',
    'improve.none': 'sem dados ainda',
    'improve.vsPrev': 'vs semana passada',
    'objective.focus': 'Melhorar foco e organização',
    'objective.emotion': 'Apoiar a regulação emocional',
    'objective.unique': 'Potencializar suas habilidades únicas',
    'area.attention': 'Atenção',
    'area.behavior': 'Comportamento',
    'area.communication': 'Comunicação',
    'area.sensory': 'Sensorial',
    'area.emotions': 'Emoções',
    'area.learning': 'Aprendizagem',
    'profile.strength1': 'Observação consciente',
    'profile.strength2': 'Curiosidade natural',
    'profile.strength3': 'Pensamento criativo',
    'profile.support1': 'Rotinas claras',
    'profile.support2': 'Pausas sensoriais',
    'profile.support3': 'Apoio emocional',
    'profile.ageUnknown': 'Idade não registrada',
    'profile.neuroProfile': 'Perfil neurodivergente',
    'profile.questionnaireResults': 'Resultados do questionário',
    'profile.strengths': 'Pontos fortes',
    'profile.supportAreas': 'Áreas de apoio',
    'profile.editProfile': 'Editar perfil',
    'profile.shareTherapist': 'Compartilhar com terapeuta',
    'profile.history': 'Histórico de avaliações',
    'profile.recentRecords': 'Registros recentes',
    'profile.initialQuestionnaire': 'Questionário inicial',
    'profile.recent': 'Recente',
    'badge.first': 'Primeiros passos',
    'badge.streak3': '3 dias seguidos',
    'badge.streak5': '5 dias seguidos',
    'badge.act10': '10 atividades',
    'badge.weekComplete': 'Semana completa',
    'badge.act25': '25 atividades',

    'lang.title': 'Escolha o idioma'
  }
};

const STORAGE_KEY = 'nb-lang';

function readSavedLang(): Lang {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en' || saved === 'pt') {
      return saved;
    }
  } catch {
    // Si el navegador bloquea localStorage, seguimos en español.
  }
  return 'es';
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

function translate(lang: Lang, key: string, vars?: Vars): string {
  let text = translations[lang][key] ?? translations.es[key] ?? key;
  if (vars) {
    for (const varKey of Object.keys(vars)) {
      text = text.split(`{${varKey}}`).join(String(vars[varKey]));
    }
  }
  return text;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'es',
  setLang: () => undefined,
  t: (key, vars) => translate('es', key, vars)
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readSavedLang());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignoramos si localStorage está bloqueado.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const t = useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}

// ───────────────────────────────────────────────────────────
// Componente reutilizable para cambiar de idioma.
// ───────────────────────────────────────────────────────────

export function LanguageSwitcher() {
  const { lang, setLang, t } = useTranslation();

  return (
    <div className="nb-lang-switch">
      <p className="nb-lang-title">{t('lang.title')}</p>
      <div className="nb-lang-options">
        {LANGS.map((option) => (
          <button
            key={option.code}
            type="button"
            className={`nb-lang-btn ${lang === option.code ? 'active' : ''}`}
            onClick={() => setLang(option.code)}
            aria-pressed={lang === option.code}
          >
            <span className="nb-lang-flag">{option.flag}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <style>{`
        .nb-lang-switch{display:flex;flex-direction:column;gap:10px}
        .nb-lang-title{margin:0;font-weight:700;color:#334155;font-size:14px}
        .nb-lang-options{display:flex;gap:8px;flex-wrap:wrap}
        .nb-lang-btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;font-weight:600;color:#334155;transition:transform .12s ease,border-color .12s ease,background .12s ease}
        .nb-lang-btn:hover{transform:translateY(-2px);border-color:#c4b5fd}
        .nb-lang-btn.active{border-color:#7c3aed;background:#f5f3ff;box-shadow:0 6px 16px rgba(124,58,237,.18)}
        .nb-lang-flag{font-size:20px;line-height:1}
      `}</style>
    </div>
  );
}
