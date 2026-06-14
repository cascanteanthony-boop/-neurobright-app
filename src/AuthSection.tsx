import { useState, useRef, useEffect, type FormEvent } from 'react';
import { supabase } from './lib/supabase';

interface AuthSectionProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess: () => void;
  onBack: () => void;
}

export default function AuthSection({ mode, onModeChange, onSuccess, onBack }: AuthSectionProps) {
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const overallTimeoutRef = useRef<number | null>(null);
  const postResponseTimeoutRef = useRef<number | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    console.log('Iniciando login...');

    // Timeout global de 8s que cancela loading y muestra error
    overallTimeoutRef.current = window.setTimeout(() => {
      console.error('Login: timeout de 8 segundos');
      setLoading(false);
      setErrorMessage('Tiempo agotado, intenta de nuevo');
    }, 25000);

    try {
      if (mode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({
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
        });

        console.log('Respuesta de Supabase recibida (signUp)', signUpError ?? null);

        if (signUpError) {
          clearTimeout(overallTimeoutRef.current ?? undefined);
          console.error(signUpError);
          setLoading(false);
          setErrorMessage(signUpError.message);
          return;
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        console.log('Respuesta de Supabase recibida (signIn)', data ?? signInError ?? null);

        clearTimeout(overallTimeoutRef.current ?? undefined);

        if (signInError) {
          console.error(signInError);
          setErrorMessage(signInError.message);
          postResponseTimeoutRef.current = window.setTimeout(() => setLoading(false), 3000);
          return;
        }

        if (data && (data as any).user) {
          console.log('Usuario autenticado', (data as any).user);
          window.location.href = '/';
          return;
        }

        postResponseTimeoutRef.current = window.setTimeout(() => setLoading(false), 3000);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('Respuesta de Supabase recibida', data ?? error ?? null);

      clearTimeout(overallTimeoutRef.current ?? undefined);

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
        postResponseTimeoutRef.current = window.setTimeout(() => setLoading(false), 3000);
        return;
      }

      if (data && (data as any).user) {
        console.log('Usuario autenticado', (data as any).user);
        window.location.href = '/';
        return;
      }

      postResponseTimeoutRef.current = window.setTimeout(() => setLoading(false), 3000);
    } catch (err) {
      console.error('Error inesperado en login', err);
      clearTimeout(overallTimeoutRef.current ?? undefined);
      setErrorMessage('Ocurrió un error inesperado');
      postResponseTimeoutRef.current = window.setTimeout(() => setLoading(false), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (overallTimeoutRef.current) clearTimeout(overallTimeoutRef.current);
      if (postResponseTimeoutRef.current) clearTimeout(postResponseTimeoutRef.current);
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
