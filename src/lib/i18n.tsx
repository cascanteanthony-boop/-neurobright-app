import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// ───────────────────────────────────────────────────────────
// NeuroBright — Motor de traducciones (i18n) — Etapa 1 (base)
//
// Cómo funciona:
// - Todos los textos viven en el objeto `translations`, organizados
//   por idioma (es / en / pt) y por "llave" (ej. 'nav.home').
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

    'welcome.title': 'Bienvenido a NeuroBright',
    'welcome.subtitle': 'Apoyo diario para acompañar el desarrollo de tu peque.',
    'welcome.register': 'Crear cuenta',
    'welcome.login': 'Iniciar sesión',

    'nav.home': 'Inicio',
    'nav.profile': 'Perfil',
    'nav.activities': 'Actividades',
    'nav.progress': 'Progreso',
    'nav.account': 'Cuenta',

    'account.language': 'Idioma',
    'account.editProfile': 'Editar perfil',
    'account.shareTherapist': 'Compartir con terapeuta',
    'account.familyPlan': 'Plan Familiar',
    'account.upgrade': 'Actualizar',
    'account.signOut': 'Cerrar sesión',

    'lang.title': 'Elegí el idioma',
    'lang.es': 'Español',
    'lang.en': 'Inglés',
    'lang.pt': 'Portugués'
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

    'welcome.title': 'Welcome to NeuroBright',
    'welcome.subtitle': "Everyday support to nurture your child's development.",
    'welcome.register': 'Create account',
    'welcome.login': 'Sign in',

    'nav.home': 'Home',
    'nav.profile': 'Profile',
    'nav.activities': 'Activities',
    'nav.progress': 'Progress',
    'nav.account': 'Account',

    'account.language': 'Language',
    'account.editProfile': 'Edit profile',
    'account.shareTherapist': 'Share with therapist',
    'account.familyPlan': 'Family Plan',
    'account.upgrade': 'Upgrade',
    'account.signOut': 'Sign out',

    'lang.title': 'Choose your language',
    'lang.es': 'Spanish',
    'lang.en': 'English',
    'lang.pt': 'Portuguese'
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

    'welcome.title': 'Bem-vindo ao NeuroBright',
    'welcome.subtitle': 'Apoio diário para acompanhar o desenvolvimento do seu filho.',
    'welcome.register': 'Criar conta',
    'welcome.login': 'Entrar',

    'nav.home': 'Início',
    'nav.profile': 'Perfil',
    'nav.activities': 'Atividades',
    'nav.progress': 'Progresso',
    'nav.account': 'Conta',

    'account.language': 'Idioma',
    'account.editProfile': 'Editar perfil',
    'account.shareTherapist': 'Compartilhar com terapeuta',
    'account.familyPlan': 'Plano Familiar',
    'account.upgrade': 'Atualizar',
    'account.signOut': 'Sair',

    'lang.title': 'Escolha o idioma',
    'lang.es': 'Espanhol',
    'lang.en': 'Inglês',
    'lang.pt': 'Português'
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
// En la Etapa 2 lo colocamos donde está el botón "Idioma".
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
