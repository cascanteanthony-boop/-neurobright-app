import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
    console.log('ResetPassword mounted', {
      href: window.location.href,
      storedEmail
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Ingresa el email usado para solicitar el código.');
      return;
    }

    if (!code) {
      setError('Ingresa el código de verificación que recibiste por email.');
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
      console.log('ResetPassword verifying OTP', { email, code });
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });

      if (verifyError) {
        console.error('ResetPassword verifyOtp error', verifyError);
        setError('Código inválido o expirado. Solicita uno nuevo.');
        return;
      }

      console.log('ResetPassword verifyOtp success, updating password');
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('ResetPassword updateUser error', updateError);
        const normalized = updateError.message.toLowerCase();
        if (/(expired|otp|one-time|invalid token|invalid input)/.test(normalized)) {
          setError('Código inválido o expirado. Solicita uno nuevo.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setMessage('¡Contraseña actualizada! Redirigiendo al login...');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
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
          <h2>Restablece tu contraseña</h2>
          <p>Ingresa el código de verificación que recibiste por email y crea una nueva contraseña.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            Código de verificación
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{8}"
              placeholder="12345678"
              maxLength={8}
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Restableciendo contraseña...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
