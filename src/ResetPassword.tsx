import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [expired, setExpired] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('ResetPassword mounted', {
      href: window.location.href,
      hash: window.location.hash
    });

    const timer = window.setTimeout(() => {
      console.log('ResetPassword: no recovery event after 5s, marking expired');
      setWaiting(false);
      setExpired(true);
      setEnabled(false);
    }, 5000);

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ResetPassword auth event', { event, session });

      if (event === 'PASSWORD_RECOVERY') {
        console.log('ResetPassword: PASSWORD_RECOVERY event received');
        setEnabled(true);
        setWaiting(false);
        setExpired(false);
        clearTimeout(timer);
        return;
      }

      if (event === 'SIGNED_IN') {
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('token_hash') || hash.includes('access_token')) {
          console.log('ResetPassword: SIGNED_IN event with recovery hash detected');
          setEnabled(true);
          setWaiting(false);
          setExpired(false);
          clearTimeout(timer);
        }
      }
    });

    return () => {
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (expired) {
      setError('Link expirado, solicita uno nuevo');
      return;
    }

    if (!enabled) {
      setError('Esperando confirmación de recuperación. Por favor espera unos segundos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      console.log('ResetPassword current session', { session, sessionError });

      if (sessionError || !session?.session) {
        setError('No hay sesión activa de recuperación. El enlace podría haber expirado.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('ResetPassword updateUser error', updateError);
        const normalized = updateError.message.toLowerCase();
        if (/(expired|otp|one-time|invalid token|invalid input)/.test(normalized)) {
          setError('Link expirado, solicita uno nuevo');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setMessage('¡Contraseña actualizada! Redirigiendo al login...');
      setSuccess(true);
    } catch (unexpectedError) {
      console.error('ResetPassword unexpected error', unexpectedError);
      const fallbackMessage = unexpectedError instanceof Error ? unexpectedError.message : 'Ocurrió un error inesperado.';
      setError(fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Crea tu nueva contraseña</h2>
          <p>
            {expired
              ? 'Link expirado. Solicita uno nuevo.'
              : waiting
              ? 'Esperando confirmación de recuperación desde Supabase...'
              : 'Ingresa una contraseña segura y confirma para recuperar tu cuenta.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nueva contraseña
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
              disabled={success}
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
              disabled={success}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="primary-button" type="submit" disabled={loading || success}>
            {loading ? 'Guardando nueva contraseña...' : 'Guardar nueva contraseña'}
          </button>
          {expired && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Volver al login
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
