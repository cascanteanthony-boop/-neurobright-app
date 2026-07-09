import { useState, useRef, useEffect, type FormEvent } from 'react';
import { supabase } from './lib/supabase';

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
      'El servidor tardó en responder (puede estar despertando). Esperá unos segundos y volvé a intentar.'
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
      setInfoMessage('Estamos despertando el servidor… esto puede tardar unos segundos ⏳');
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
          setInfoMessage('El servidor está tardando, reintentando…');
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

      setErrorMessage('No se pudo iniciar sesión. Intentá de nuevo.');
    } catch (err) {
      console.error('Error inesperado en login', err);
      setErrorMessage('Ocurrió un error inesperado. Intentá de nuevo.');
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
      setErrorMessage('Escribe tu email para recibir el código de recuperación.');
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
    setInfoMessage('Te enviamos un código de verificación a tu email. Redirigiendo...');
    window.location.href = '/reset-password';
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <button className="link-button" onClick={onBack}>
          ← Volver
        </button>

        <div className="auth-header">
          <h2>
            {forgotMode
              ? 'Olvidé mi contraseña'
              : mode === 'login'
              ? 'Inicia sesión'
              : 'Crea tu cuenta'}
          </h2>
          <p>
            {forgotMode
              ? 'Envía el código a tu email y úsalo para crear una nueva contraseña.'
              : mode === 'login'
              ? 'Accede con tu email y contraseña para gestionar actividades y progreso.'
              : 'Regístrate para crear un perfil cálido y personalizado para tu niño.'}
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
              Email
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
              {loading ? 'Enviando código...' : 'Enviar código'}
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
              Volver al login
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Nombre del padre/madre
                <input
                  value={parentName}
                  onChange={(event) => setParentName(event.target.value)}
                  type="text"
                  placeholder="Tu nombre"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="nombre@ejemplo.com"
                required
              />
            </label>
            <label>
              Contraseña
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
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            {mode === 'register' && (
              <>
                <label>
                  Nombre del hijo/a
                  <input
                    value={childName}
                    onChange={(event) => setChildName(event.target.value)}
                    type="text"
                    placeholder="Nombre del niño/a"
                    required
                  />
                </label>
                <label>
                  Edad del hijo/a
                  <input
                    value={childAge}
                    onChange={(event) => setChildAge(event.target.value)}
                    type="number"
                    min={1}
                    max={18}
                    placeholder="Edad"
                    required
                  />
                </label>
              </>
            )}
            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {infoMessage && <p className="auth-success">{infoMessage}</p>}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          </form>
        )}

        {!forgotMode && (
          <div className="auth-toggle">
            <span>
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button className="text-button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
