import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryDetected, setRecoveryDetected] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const detectRecoveryFromUrl = () => {
      const params = new URL(window.location.href).searchParams;
      if (params.get('type') === 'recovery' || params.get('access_token')) {
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
      }, 1600);
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
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Tu contraseña ha sido actualizada. Redirigiendo al login...');
    setSuccess(true);
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

          <button className="primary-button" type="submit" disabled={loading || success}>
            {loading ? 'Guardando nueva contraseña...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
