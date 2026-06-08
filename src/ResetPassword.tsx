import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const getResetTokens = () => {
  const hash = window.location.hash.replace(/^#/, '?');
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    tokenHash: params.get('token_hash'),
    type: params.get('type')
  };
};

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryDetected, setRecoveryDetected] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { accessToken, refreshToken, tokenHash, type } = getResetTokens();
    console.log('ResetPassword token debug', {
      href: window.location.href,
      hash: window.location.hash,
      accessToken,
      refreshToken,
      tokenHash,
      type
    });

    if (type === 'recovery' || accessToken || tokenHash) {
      setRecoveryDetected(true);
    }
  }, []);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [success]);

  const attemptSession = async () => {
    const { accessToken, refreshToken, tokenHash } = getResetTokens();

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (!sessionError) {
        return true;
      }
      console.warn('ResetPassword setSession failed', sessionError);
    }

    if (tokenHash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token: tokenHash,
        type: 'recovery'
      });
      if (!verifyError) {
        return true;
      }
      console.warn('ResetPassword verifyOtp failed', verifyError);
    }

    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      const sessionReady = await attemptSession();
      if (!sessionReady) {
        setError('Link expirado, solicita uno nuevo');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
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
      console.error('ResetPassword error', unexpectedError);
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
        </form>
      </div>
    </main>
  );
}
