import { useEffect, useRef, useState, type CSSProperties } from 'react';

export interface ActivityInfo {
  icon: string;
  title: string;
  duration: number;
  category: string;
  color: string;
  description: string;
}

interface BodyProps {
  activity: ActivityInfo;
  onClose: () => void;
  onComplete: (activity: ActivityInfo) => void;
}

const TOTAL_CYCLES = 4;        // ← cambiá este número para más/menos respiraciones
const CYCLE_SECONDS = 19;      // 4 inhala + 7 sostén + 8 exhala

const primaryBtn = (color: string): CSSProperties => ({
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: color, color: '#fff', fontSize: 16, fontWeight: 600,
  cursor: 'pointer', marginBottom: 12
});
const completeBtn: CSSProperties = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: 'linear-gradient(135deg, #6C63FF, #4ECDC4)', color: '#fff',
  fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10
};
const backBtn: CSSProperties = {
  width: '100%', padding: 12, borderRadius: 14, border: '1px solid #dddddd',
  background: '#fff', color: '#6b6b85', fontSize: 15, cursor: 'pointer'
};

function BreathingExercise({ activity, onClose, onComplete }: BodyProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= CYCLE_SECONDS) {
          setCycle((c) => {
            if (c >= TOTAL_CYCLES) { setRunning(false); setFinished(true); return c; }
            return c + 1;
          });
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  const started = running || elapsed > 0;
  let phaseLabel = 'Prepárate';
  let phaseCount = 0;
  let scale = 0.9;
  let transitionSeconds = 0.5;

  if (finished) {
    phaseLabel = '¡Bien hecho!'; scale = 1;
  } else if (started) {
    if (elapsed < 4) { phaseLabel = 'Inhala'; phaseCount = 4 - elapsed; scale = 1.5; transitionSeconds = 4; }
    else if (elapsed < 11) { phaseLabel = 'Sostén'; phaseCount = 11 - elapsed; scale = 1.5; transitionSeconds = 0.5; }
    else { phaseLabel = 'Exhala'; phaseCount = 19 - elapsed; scale = 0.6; transitionSeconds = 8; }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: activity.color }}>{phaseLabel}</div>
        <div style={{ fontSize: 14, color: '#6b6b85', minHeight: 18 }}>{phaseCount > 0 ? `${phaseCount}s` : '\u00a0'}</div>
      </div>
      <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${activity.color}, ${activity.color}bb)`,
          transform: `scale(${scale})`,
          transition: `transform ${transitionSeconds}s ease-in-out`,
          boxShadow: `0 10px 30px ${activity.color}55`
        }} />
      </div>
      <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 16 }}>
        {finished ? 'Completaste la respiración 🌿' : `Ciclo ${cycle} de ${TOTAL_CYCLES}`}
      </p>
      {!finished && (
        <button onClick={() => setRunning((r) => !r)} style={primaryBtn(activity.color)}>
          {running ? 'Pausar' : started ? 'Continuar' : 'Comenzar'}
        </button>
      )}
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>Completar actividad</button>
      <button onClick={onClose} style={backBtn}>Volver</button>
    </>
  );
}

function TimerExercise({ activity, onClose, onComplete }: BodyProps) {
  const totalSeconds = activity.duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setRunning(false); setFinished(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const progress = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  return (
    <>
      <div style={{ fontSize: 48, fontWeight: 700, color: activity.color, marginBottom: 8, textAlign: 'center' }}>{minutes}:{seconds}</div>
      <div style={{ height: 8, background: '#eeeeee', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: activity.color, transition: 'width 0.3s' }} />
      </div>
      {finished ? (
        <p style={{ color: '#2e9e5b', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>¡Actividad completada! 🎉</p>
      ) : (
        <button onClick={() => setRunning((r) => !r)} style={primaryBtn(activity.color)}>
          {running ? 'Pausar' : secondsLeft === totalSeconds ? 'Comenzar' : 'Continuar'}
        </button>
      )}
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>Completar actividad</button>
      <button onClick={onClose} style={backBtn}>Volver</button>
    </>
  );
}

export default function ActivityScreen({ activity, onClose, onComplete }: BodyProps) {
  const isBreathing = activity.title.includes('Respiración');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(25, 25, 50, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `${activity.color}22` }}>{activity.icon}</div>
          <span style={{ display: 'inline-block', background: activity.color, color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, marginBottom: 10 }}>{activity.category}</span>
          <h2 style={{ margin: '4px 0 8px', color: '#2b2b55' }}>{activity.title}</h2>
          <p style={{ color: '#6b6b85', margin: 0, lineHeight: 1.5 }}>{activity.description}</p>
        </div>
        {isBreathing
          ? <BreathingExercise activity={activity} onClose={onClose} onComplete={onComplete} />
          : <TimerExercise activity={activity} onClose={onClose} onComplete={onComplete} />}
      </div>
    </div>
  );
}