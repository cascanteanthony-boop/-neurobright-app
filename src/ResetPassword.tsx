import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryDetected, setRecoveryDetected] = useState(false);
  const [expiredToken, setExpiredToken] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const detectRecoveryFromUrl = () => {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, '?'));
      const accessToken = params.get('access_token') || hashParams.get('access_token');
      const type = params.get('type') || hashParams.get('type');

      console.log('ResetPassword token debug', {
        href: window.location.href,
        params: Object.fromEntries(params.entries()),
        hashParams: Object.fromEntries(hashParams.entries()),
        accessToken,
        type
      });

      if (type === 'recovery' || accessToken) {
        setRecoveryDetected(true);
      }
    };

    detectRecoveryFromUrl();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryDetected(true);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

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
          setExpiredToken(true);
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
            {recoveryDetected
              ? 'Ingresa una contraseña segura y confirma para completar la recuperación de tu cuenta.'
              : 'Si llegaste aquí desde un enlace de recuperación de contraseña, ingresa tu nueva contraseña.'}
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
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}
          {expiredToken && (
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

          <button className="primary-button" type="submit" disabled={loading || success}>
            {loading ? 'Guardando nueva contraseña...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
