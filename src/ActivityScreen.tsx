import { useEffect, useRef, useState } from 'react';

export interface ActivityInfo {
  icon: string;
  title: string;
  duration: number;
  category: string;
  color: string;
  description: string;
}

interface ActivityScreenProps {
  activity: ActivityInfo;
  onClose: () => void;
  onComplete: (activity: ActivityInfo) => void;
}

export default function ActivityScreen({ activity, onClose, onComplete }: ActivityScreenProps) {
  const totalSeconds = activity.duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setIsRunning(false);
            setFinished(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const progress = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  const handleComplete = () => {
    onComplete(activity);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(25, 25, 50, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `${activity.color}22` }}>
          {activity.icon}
        </div>

        <span style={{ display: 'inline-block', background: activity.color, color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, marginBottom: 10 }}>
          {activity.category}
        </span>

        <h2 style={{ margin: '4px 0 8px', color: '#2b2b55' }}>{activity.title}</h2>
        <p style={{ color: '#6b6b85', margin: '0 0 18px', lineHeight: 1.5 }}>{activity.description}</p>

        <div style={{ fontSize: 48, fontWeight: 700, color: activity.color, marginBottom: 8 }}>
          {minutes}:{seconds}
        </div>

        <div style={{ height: 8, background: '#eeeeee', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: activity.color, transition: 'width 0.3s' }} />
        </div>

        {finished ? (
          <p style={{ color: '#2e9e5b', fontWeight: 600, marginBottom: 16 }}>¡Actividad completada! 🎉</p>
        ) : (
          <button onClick={() => setIsRunning((r) => !r)} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: activity.color, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            {isRunning ? 'Pausar' : secondsLeft === totalSeconds ? 'Comenzar' : 'Continuar'}
          </button>
        )}

        <button onClick={handleComplete} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6C63FF, #4ECDC4)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
          Completar actividad
        </button>

        <button onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 14, border: '1px solid #dddddd', background: '#fff', color: '#6b6b85', fontSize: 15, cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    </div>
  );
}