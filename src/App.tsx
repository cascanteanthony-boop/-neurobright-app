import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import WelcomeScreen from './WelcomeScreen';
import AuthSection from './AuthSection';
import NavShell from './NavShell';
import Questionnaire from './Questionnaire';
import ResetPassword from './ResetPassword';
import type { UserMetadata } from './types';

export type AppView = 'welcome' | 'auth' | 'questionnaire' | 'home' | 'resetPassword';

function App() {
  const resetPath = window.location.pathname === '/reset-password';
  const [view, setView] = useState<AppView>(resetPath ? 'resetPassword' : 'welcome');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata>({});

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setUser(null);
      setUserMetadata({});
      return null;
    }

    setUser(data.user);
    const metadata = {
      ...(data.user.user_metadata ?? {}),
      parentEmail: data.user.email ?? undefined
    } as UserMetadata;
    setUserMetadata(metadata);
    return data.user;
  };

  useEffect(() => {
    const initializeSession = async () => {
      if (resetPath) {
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = await refreshUser();
        const metadata = (user?.user_metadata ?? {}) as UserMetadata;
        setView(metadata.questionnaireCompleted ? 'home' : 'questionnaire');
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('resetPassword');
        return;
      }

      if (resetPath) {
        return;
      }

      if (session) {
        const user = await refreshUser();
        const metadata = (user?.user_metadata ?? {}) as UserMetadata;
        setView(metadata.questionnaireCompleted ? 'home' : 'questionnaire');
      } else {
        setUser(null);
        setUserMetadata({});
        setAuthMode('login');
        setView('welcome');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // ───────────────────────────────────────────────────────────
  // NUEVO: Cierre automático de sesión por inactividad
  // Cambiá el número de minutos en INACTIVITY_MINUTES.
  // Para PROBAR rápido, poné 0.5 (= 30 segundos). Para uso real, 10.
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Solo vigilamos cuando hay sesión iniciada
    if (!user) return;

    const INACTIVITY_MINUTES = 10;
    const INACTIVITY_LIMIT = INACTIVITY_MINUTES * 60 * 1000;
    let timeoutId: number;

    const cerrarPorInactividad = async () => {
      await supabase.auth.signOut();
    };

    const reiniciarTemporizador = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(cerrarPorInactividad, INACTIVITY_LIMIT);
    };

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));

    reiniciarTemporizador(); // arrancar el conteo

    return () => {
      window.clearTimeout(timeoutId);
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
    };
  }, [user]);
  // ───────────────────────────────────────────────────────────

  const handleAuthSuccess = async () => {
    const user = await refreshUser();
    if (!user) {
      setView('auth');
      return;
    }

    const metadata = (user.user_metadata ?? {}) as UserMetadata;
    if (authMode === 'register' || !metadata.questionnaireCompleted) {
      setView('questionnaire');
      return;
    }

    setView('home');
  };

  const handleQuestionnaireComplete = (metadata: UserMetadata) => {
    setUserMetadata(metadata);
    setView('home');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserMetadata({});
    setAuthMode('login');
    setView('auth');
  };

  return (
    <div className="app-shell">
      {view === 'welcome' && (
        <WelcomeScreen
          onRegister={() => {
            setAuthMode('register');
            setView('auth');
          }}
          onLogin={() => {
            setAuthMode('login');
            setView('auth');
          }}
        />
      )}

      {view === 'auth' && (
        <AuthSection
          mode={authMode}
          onModeChange={setAuthMode}
          onSuccess={handleAuthSuccess}
          onBack={() => setView('welcome')}
        />
      )}

      {view === 'questionnaire' && (
        <Questionnaire userMetadata={userMetadata} onComplete={handleQuestionnaireComplete} />
      )}

      {view === 'resetPassword' && <ResetPassword />}
      {view === 'home' && <NavShell userMetadata={userMetadata} onSignOut={handleSignOut} />}
    </div>
  );
}

export default App;