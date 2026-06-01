import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import WelcomeScreen from './WelcomeScreen';
import AuthSection from './AuthSection';
import NavShell from './NavShell';

export type AppView = 'welcome' | 'auth' | 'home';

function App() {
  const [view, setView] = useState<AppView>('welcome');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setView('home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setView('home');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
          onSuccess={() => setView('home')}
          onBack={() => setView('welcome')}
        />
      )}
      {view === 'home' && <NavShell onSignOut={handleSignOut} />}
    </div>
  );
}

export default App;
