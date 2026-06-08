import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryDetected, setRecoveryDetected] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, '?'));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('ResetPassword token debug', {
        href: window.location.href,
        hash: window.location.hash,
        accessToken,
        refreshToken,
        type
      });

      if (type !== 'recovery' || !accessToken || !refreshToken) {
        setInvalidLink(true);
        setError('Link inválido o expirado');
        setRecoveryDetected(false);
        setSessionLoading(false);
        return;
      }

      setRecoveryDetected(true);

      try {
        setSessionLoading(true);
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('ResetPassword setSession error', sessionError);
          setInvalidLink(true);
          setError('Link inválido o expirado');
          setSessionReady(false);
          return;
        }

        setSessionReady(true);
      } catch (unexpectedError) {
        console.error('ResetPassword setSession unexpected error', unexpectedError);
        setInvalidLink(true);
        setError('Link inválido o expirado');
      } finally {
        setSessionLoading(false);
      }
    };

    initializeSession();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!sessionReady) {
      setError('No se pudo validar el enlace.');
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        const normalized = updateError.message.toLowerCase();
        if (/(expired|otp|one-time|invalid token|invalid input)/.test(normalized)) {
          setInvalidLink(true);
          setError('Este link expiró. Solicita uno nuevo');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setMessage('¡Contraseña actualizada! Redirigiendo al login...');
      setSuccess(true);
    } catch (unexpectedError) {
      console.error('ResetPassword updateUser error', unexpectedError);
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
            {invalidLink
              ? 'Link inválido o expirado. Solicita uno nuevo.'
              : recoveryDetected
              ? sessionLoading
                ? 'Verificando tu enlace...'
                : 'Ingresa una contraseña segura y confirma para completar la recuperación de tu cuenta.'
              : 'Si llegaste aquí desde un enlace de recuperación de contraseña, ingresa tu nueva contraseña.'}
          </p>
        </div>

        {invalidLink ? (
          <div className="auth-form">
            {error && <p className="auth-error">{error}</p>}
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Volver al login
            </button>
          </div>
        ) : (
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
                disabled={!sessionReady || sessionLoading || success}
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
                disabled={!sessionReady || sessionLoading || success}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success">{message}</p>}

            <button
              className="primary-button"
              type="submit"
              disabled={loading || !sessionReady || sessionLoading || success}
            >
              {loading ? 'Guardando nueva contraseña...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
