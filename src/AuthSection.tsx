import { useState, useRef, useEffect, type FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { useTranslation } from './lib/i18n';

interface AuthSectionProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess: () => void;
  onBack: () => void;
}

// ───────────────────────────────────────────────────────────
// Manejo de "cold start" de Supabase (plan gratuito nano).
// - WARMING_DELAY: a los pocos segundos avisamos que el servidor
//   puede estar "despertando".
// - ATTEMPT_TIMEOUT: cuánto espera cada intento antes de rendirse.
// - MAX_LOGIN_ATTEMPTS: cuántas veces reintenta el login solo.
// ───────────────────────────────────────────────────────────
const WARMING_DELAY = 4000;
const ATTEMPT_TIMEOUT = 18000;
const MAX_LOGIN_ATTEMPTS = 2;

const TIMEOUT = { __timeout: true } as const;
type TimeoutResult = typeof TIMEOUT;

// Corre una promesa con un límite de tiempo. Si se pasa del tiempo,
// devuelve el marcador TIMEOUT en vez de quedarse esperando para siempre.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | TimeoutResult> {
  return Promise.race([
    promise,
    new Promise<TimeoutResult>((resolve) => window.setTimeout(() => resolve(TIMEOUT), ms))
  ]);
}

export default function AuthSection({ mode, onModeChange, onBack }: AuthSectionProps) {
  const { t } = useTranslation();
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const warmingTimerRef = useRef<number | null>(null);

  const showTimeoutMessage = () => {
    setErrorMessage(
      t('auth.timeout')
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    console.log('Iniciando login...');

    // Tras unos segundos, avisamos que el servidor puede estar despertando.
    warmingTimerRef.current = window.setTimeout(() => {
      setInfoMessage(t('auth.warming'));
    }, WARMING_DELAY);

    try {
      // REGISTRO: primero creamos la cuenta (un solo intento).
      if (mode === 'register') {
        const signUpRes = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                parentName,
                childName,
                childAge: childAge ? Number(childAge) : null
              }
            }
          }),
          ATTEMPT_TIMEOUT
        );

        if ('__timeout' in signUpRes) {
          showTimeoutMessage();
          return;
        }
        if (signUpRes.error) {
          console.error(signUpRes.error);
          setErrorMessage(signUpRes.error.message);
          return;
        }
      }

      // LOGIN (también tras el registro): con reintento automático.
      let signInRes: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>> | null = null;
      for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt += 1) {
        if (attempt > 1) {
          setInfoMessage(t('auth.retrying'));
        }
        const res = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          ATTEMPT_TIMEOUT
        );
        if (!('__timeout' in res)) {
          signInRes = res;
          break;
        }
      }

      if (!signInRes) {
        showTimeoutMessage();
        return;
      }
      if (signInRes.error) {
        console.error(signInRes.error);
        setErrorMessage(signInRes.error.message);
        return;
      }
      if (signInRes.data.user) {
        console.log('Usuario autenticado');
        window.location.href = '/';
        return;
      }

      setErrorMessage(t('auth.noLogin'));
    } catch (err) {
      console.error('Error inesperado en login', err);
      setErrorMessage(t('auth.unexpected'));
    } finally {
      if (warmingTimerRef.current) {
        clearTimeout(warmingTimerRef.current);
        warmingTimerRef.current = null;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (warmingTimerRef.current) clearTimeout(warmingTimerRef.current);
    };
  }, []);

  const handleForgotPassword = async () => {
    setErrorMessage('');
    setInfoMessage('');
    if (!email) {
      setErrorMessage(t('auth.needEmail'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    localStorage.setItem('resetEmail', email);
    setInfoMessage(t('auth.codeSent'));
    window.location.href = '/reset-password';
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <button className="link-button" onClick={onBack}>
          {t('auth.back')}
        </button>

        <div className="auth-header">
          <h2>
            {forgotMode
              ? t('auth.forgotTitle')
              : mode === 'login'
              ? t('auth.loginTitle')
              : t('auth.registerTitle')}
          </h2>
          <p>
            {forgotMode
              ? t('auth.forgotSub')
              : mode === 'login'
              ? t('auth.loginSub')
              : t('auth.registerSub')}
          </p>
        </div>

        {forgotMode ? (
          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await handleForgotPassword();
            }}
          >
            <label>
              {t('auth.email')}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="nombre@ejemplo.com"
                required
              />
            </label>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {infoMessage && <p className="auth-success">{infoMessage}</p>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? t('auth.sendingCode') : t('auth.sendCode')}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setForgotMode(false);
                setErrorMessage('');
                setInfoMessage('');
              }}
            >
              {t('auth.backToLogin')}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                {t('auth.parentName')}
                <input
                  value={parentName}
                  onChange={(event) => setParentName(event.target.value)}
                  type="text"
                  placeholder={t('auth.yourName')}
                  required
                />
              </label>
            )}
            <label>
              {t('auth.email')}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="nombre@ejemplo.com"
                required
              />
            </label>
            <label>
              {t('auth.password')}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </label>
            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button type="button" className="text-button" onClick={() => setForgotMode(true)}>
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}
            {mode === 'register' && (
              <>
                <label>
                  {t('auth.childName')}
                  <input
                    value={childName}
                    onChange={(event) => setChildName(event.target.value)}
                    type="text"
                    placeholder={t('auth.childNamePlaceholder')}
                    required
                  />
                </label>
                <label>
                  {t('auth.childAge')}
                  <input
                    value={childAge}
                    onChange={(event) => setChildAge(event.target.value)}
                    type="number"
                    min={1}
                    max={18}
                    placeholder={t('auth.agePlaceholder')}
                    required
                  />
                </label>
              </>
            )}
            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {infoMessage && <p className="auth-success">{infoMessage}</p>}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? t('auth.processing') : mode === 'login' ? t('auth.enter') : t('auth.register')}
            </button>
          </form>
        )}

        {!forgotMode && (
          <div className="auth-toggle">
            <span>
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
            </span>
            <button className="text-button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t('auth.registerLink') : t('auth.loginLink')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
