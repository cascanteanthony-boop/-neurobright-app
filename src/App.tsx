import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import WelcomeScreen from './WelcomeScreen';
import AuthSection from './AuthSection';
import NavShell from './NavShell';
import Questionnaire from './Questionnaire';
import type { UserMetadata } from './types';

export type AppView = 'welcome' | 'auth' | 'questionnaire' | 'home';

function App() {
  const [view, setView] = useState<AppView>('welcome');
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
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = await refreshUser();
        const metadata = (user?.user_metadata ?? {}) as UserMetadata;
        setView(metadata.questionnaireCompleted ? 'home' : 'questionnaire');
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

      {view === 'home' && <NavShell userMetadata={userMetadata} onSignOut={handleSignOut} />}
    </div>
  );
}

export default App;
