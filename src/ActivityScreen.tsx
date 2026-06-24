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
  childAge?: number;
  childLevel?: number;
  onEmotionLog?: (entry: { emotion: string; label: string; intensity: number; date: string }) => void;
}

const TOTAL_CYCLES = 4;
const CYCLE_SECONDS = 19;

const primaryBtn = (color: string): CSSProperties => ({
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: color, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12
});
const completeBtn: CSSProperties = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: 'linear-gradient(135deg, #6C63FF, #4ECDC4)', color: '#fff',
  fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10
};
const backBtn: CSSProperties = {
  width: '100%', padding: 12, borderRadius: 14, border: '1px solid #dddddd',
  background: '#fff', color: '#6b6b85', fontSize: 15, cursor: 'pointer', marginBottom: 10
};

// Sonidos generados por el navegador (sin archivos)
let audioCtx: AudioContext | null = null;
function playSound(type: 'flip' | 'match' | 'win' | 'bubble') {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'bubble') {
      // pop suave y descendente, agradable para actividad sensorial
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
      return;
    }

    const notes = type === 'flip' ? [523] : type === 'match' ? [659, 784] : [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // si el navegador bloquea el audio, lo ignoramos
  }
}

// Respiración 4-7-8
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
          setCycle((c) => { if (c >= TOTAL_CYCLES) { setRunning(false); setFinished(true); return c; } return c + 1; });
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  const started = running || elapsed > 0;
  let phaseLabel = 'Prepárate', phaseCount = 0, scale = 0.9, transitionSeconds = 0.5;
  if (finished) { phaseLabel = '¡Bien hecho!'; scale = 1; }
  else if (started) {
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
          transform: `scale(${scale})`, transition: `transform ${transitionSeconds}s ease-in-out`,
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

// Juego de memoria adaptativo por edad
interface Card { id: number; emoji: string; matched: boolean; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Parejas según EDAD (base) y NIVEL (progresión semanal). Tope 10 parejas.
function getMemoryEmojis(age: number | undefined, level: number): string[] {
  const a = age ?? 7;
  const youngPool = ['🐶', '🐱', '🐰', '🐸', '🦊', '🐵', '🐼', '🐯', '🦁', '🐮'];
  const olderPool = ['🚀', '⚽', '🎸', '🎨', '🍎', '🌟', '🚗', '🦋', '🌈', '🎁', '🪁', '🧩'];
  const pool = shuffle(a <= 7 ? youngPool : olderPool);
  const basePairs = a <= 5 ? 4 : a <= 7 ? 6 : 8;
  const pairs = Math.min(basePairs + (level - 1), 10, pool.length);
  return pool.slice(0, pairs);
}

function buildDeck(age: number | undefined, level: number): Card[] {
  const emojis = getMemoryEmojis(age, level);
  const cards = [...emojis, ...emojis];
  return shuffle(cards).map((emoji, index) => ({ id: index, emoji, matched: false }));
}

function MemoryGame({ activity, onClose, onComplete, childAge, childLevel }: BodyProps) {
  const level = childLevel ?? 1;
  const [cards, setCards] = useState<Card[]>(() => buildDeck(childAge, level));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finalSeconds, setFinalSeconds] = useState<number | null>(null);

  const matchedCount = cards.filter((c) => c.matched).length;
  const won = matchedCount === cards.length;

  const handleFlip = (index: number) => {
    if (lock || won) return;
    if (cards[index].matched || flipped.includes(index) || flipped.length === 2) return;

    if (startTime === null) setStartTime(Date.now());
    playSound('flip');
    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      setLock(true);
      const [a, b] = next;
      if (cards[a].emoji === cards[b].emoji) {
        const willWin = cards.filter((c) => c.matched).length + 2 === cards.length;
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setFlipped([]); setLock(false);
          if (willWin) {
            setFinalSeconds(startTime ? Math.round((Date.now() - startTime) / 1000) : 0);
            playSound('win');
          } else {
            playSound('match');
          }
        }, 600);
      } else {
        setTimeout(() => { setFlipped([]); setLock(false); }, 900);
      }
    }
  };

  const restart = () => {
    setCards(buildDeck(childAge, level)); setFlipped([]); setMoves(0); setLock(false);
    setStartTime(null); setFinalSeconds(null);
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ display: 'inline-block', background: `${activity.color}22`, color: activity.color, fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 999 }}>Nivel {level}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b6b85', fontSize: 14, marginBottom: 12 }}>
        <span>Parejas: {matchedCount / 2} / {cards.length / 2}</span>
        <span>Intentos: {moves}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {cards.map((card, index) => {
          const faceUp = card.matched || flipped.includes(index);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(index)}
              style={{
                aspectRatio: '1 / 1', minHeight: 56, borderRadius: 12, border: 'none',
                cursor: faceUp ? 'default' : 'pointer', fontSize: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: card.matched ? `${activity.color}22` : faceUp ? '#fff' : activity.color,
                boxShadow: faceUp ? `inset 0 0 0 2px ${activity.color}55` : '0 4px 10px rgba(0,0,0,0.12)',
                transition: 'background 0.2s'
              }}
            >
              {faceUp ? card.emoji : ''}
            </button>
          );
        })}
      </div>
      {won && (
        <p style={{ textAlign: 'center', color: '#2e9e5b', fontWeight: 700, marginBottom: 12 }}>
          ¡Ganaste! 🎉 {moves} intentos{finalSeconds !== null ? ` · ${finalSeconds}s` : ''}
        </p>
      )}
      <button onClick={restart} style={backBtn}>Reiniciar</button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>Completar actividad</button>
      <button onClick={onClose} style={backBtn}>Volver</button>
    </>
  );
}

// Burbujas de calma (actividad sensorial)
interface Bubble { id: number; left: number; size: number; color: string; duration: number; popping?: boolean; }

const BUBBLE_COLORS = ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#B5D8FF', '#D7BDE2', '#FFAAA5', '#C7CEEA'];
const PLAY_HEIGHT = 320;

// Configuración de burbujas según edad: más pequeños = más grandes, lentas y pocas
function getBubbleConfig(age?: number) {
  const a = age ?? 7;
  if (a <= 5) return { minSize: 64, sizeRange: 40, minDur: 8, durRange: 4, max: 5, spawnMs: 1200 };
  if (a <= 9) return { minSize: 50, sizeRange: 36, minDur: 6.5, durRange: 3.5, max: 7, spawnMs: 950 };
  return { minSize: 44, sizeRange: 34, minDur: 6, durRange: 3, max: 8, spawnMs: 850 };
}

function SensoryBubbles({ activity, onClose, onComplete, childAge }: BodyProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const [muted, setMuted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    const cfg = getBubbleConfig(childAge);
    const spawn = () => {
      setBubbles((prev) => {
        if (prev.length >= cfg.max) return prev; // límite suave: no saturar los sentidos
        const id = idRef.current++;
        const size = cfg.minSize + Math.random() * cfg.sizeRange;
        return [...prev, {
          id,
          left: 4 + Math.random() * 78,
          size,
          color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
          duration: cfg.minDur + Math.random() * cfg.durRange
        }];
      });
    };
    spawn();
    const interval = window.setInterval(spawn, cfg.spawnMs);
    return () => window.clearInterval(interval);
  }, [childAge]);

  const removeBubble = (id: number) => setBubbles((prev) => prev.filter((b) => b.id !== id));

  const popBubble = (id: number) => {
    if (!muted) playSound('bubble');
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popping: true } : b)));
    setPopped((n) => n + 1);
    window.setTimeout(() => removeBubble(id), 280);
  };

  return (
    <>
      <style>{`
        @keyframes nb-float-up { from { transform: translateY(0); } to { transform: translateY(-540px); } }
        @keyframes nb-pop { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.7); opacity: 0; } }
      `}</style>
      <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 10 }}>
        Toca las burbujas para reventarlas. No hay apuro 🫧
      </p>
      <div style={{ position: 'relative', height: PLAY_HEIGHT, overflow: 'hidden', borderRadius: 16, background: 'linear-gradient(180deg, #eef6ff, #f6f0ff)', marginBottom: 14 }}>
        {bubbles.map((b) => (
          <div
            key={b.id}
            onAnimationEnd={() => removeBubble(b.id)}
            style={{
              position: 'absolute', bottom: -90, left: `${b.left}%`,
              width: b.size, height: b.size,
              pointerEvents: b.popping ? 'none' : 'auto',
              animation: `nb-float-up ${b.duration}s linear forwards`
            }}
          >
            <button
              onClick={() => popBubble(b.id)}
              aria-label="burbuja"
              style={{
                width: '100%', height: '100%', borderRadius: '50%', border: 'none', padding: 0,
                cursor: 'pointer',
                background: `radial-gradient(circle at 32% 28%, #ffffffcc, ${b.color})`,
                boxShadow: `0 6px 16px ${b.color}88, inset 0 0 12px #ffffff66`,
                animation: b.popping ? 'nb-pop 0.3s ease-out forwards' : undefined
              }}
            />
          </div>
        ))}
        <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 13, color: '#7a7a99', background: '#ffffffcc', padding: '2px 10px', borderRadius: 999 }}>
          Burbujas: {popped}
        </div>
      </div>
      <button onClick={() => setMuted((m) => !m)} style={backBtn}>
        {muted ? '🔇 Sonido apagado' : '🔊 Sonido encendido'}
      </button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>Completar actividad</button>
      <button onClick={onClose} style={backBtn}>Volver</button>
    </>
  );
}

// Diario de emociones (check-in emocional)
interface Emotion { emoji: string; label: string; tone: 'bien' | 'dificil'; message: string; tip: string; }

function getEmotionsForAge(age?: number): Emotion[] {
  const base: Emotion[] = [
    { emoji: '😊', label: 'Feliz', tone: 'bien', message: '¡Qué lindo sentirse feliz! Disfruta este momento.', tip: 'Comparte tu alegría con alguien que quieres.' },
    { emoji: '😌', label: 'Tranquilo', tone: 'bien', message: 'Sentirse en calma es algo muy bueno.', tip: 'Guarda esta sensación; puedes volver a ella cuando la necesites.' },
    { emoji: '😢', label: 'Triste', tone: 'dificil', message: 'Está bien sentirse triste, le pasa a todas las personas.', tip: 'Habla con alguien de confianza o haz un dibujo de cómo te sientes.' },
    { emoji: '😠', label: 'Enojado', tone: 'dificil', message: 'El enojo es normal. Vamos a soltarlo de a poquito.', tip: 'Respira despacio 3 veces o abraza un cojín con suavidad.' },
    { emoji: '😨', label: 'Asustado', tone: 'dificil', message: 'El miedo nos avisa para cuidarnos. Aquí estás a salvo.', tip: 'Respira hondo y cuéntale tu miedo a un adulto de confianza.' },
    { emoji: '😴', label: 'Cansado', tone: 'dificil', message: 'Tu cuerpo te pide descanso. Vale la pena escucharlo.', tip: 'Busca un momento tranquilo para recargar energías.' }
  ];
  const a = age ?? 7;
  if (a <= 6) return base;
  return [
    ...base,
    { emoji: '😰', label: 'Nervioso', tone: 'dificil', message: 'Sentir nervios antes de algo importante es normal.', tip: 'Respira lento; la actividad de Burbujas de calma puede ayudarte.' },
    { emoji: '😤', label: 'Frustrado', tone: 'dificil', message: 'La frustración aparece cuando algo cuesta. Es parte de aprender.', tip: 'Tómate un descanso corto y vuelve a intentarlo con calma.' },
    { emoji: '🤩', label: 'Emocionado', tone: 'bien', message: '¡La emoción es energía buena!', tip: 'Cuéntale a alguien qué te emociona tanto.' }
  ];
}

function EmotionDiary({ activity, onClose, onComplete, childAge, onEmotionLog }: BodyProps) {
  const emotions = getEmotionsForAge(childAge);
  const [step, setStep] = useState<'select' | 'intensity' | 'result'>('select');
  const [selected, setSelected] = useState<Emotion | null>(null);
  const [pressing, setPressing] = useState<string | null>(null);

  const goodColor = '#4ECDC4';
  const hardColor = '#FF8DAA';
  const tone = selected?.tone === 'bien' ? goodColor : hardColor;

  const pickEmotion = (e: Emotion) => {
    setSelected(e);
    setPressing(e.label);
    window.setTimeout(() => { setStep('intensity'); setPressing(null); }, 360);
  };

  const confirmIntensity = (value: number) => {
    if (selected && onEmotionLog) {
      onEmotionLog({ emotion: selected.emoji, label: selected.label, intensity: value, date: new Date().toISOString() });
    }
    setStep('result');
  };

  const restart = () => { setSelected(null); setStep('select'); };

  if (step === 'select') {
    return (
      <>
        <style>{`
          @keyframes nb-emo-pop { 0% { transform: scale(1); } 50% { transform: scale(1.32); } 100% { transform: scale(1.12); } }
          @keyframes nb-emo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
          .nb-emo { transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s; will-change: transform; }
          .nb-emo:hover { transform: translateY(-5px) scale(1.05); box-shadow: 0 14px 24px rgba(0,0,0,0.16); }
          .nb-emo:active { transform: scale(.95); }
          .nb-emo-emoji { display: inline-block; filter: drop-shadow(0 5px 7px rgba(0,0,0,0.28)); transition: transform .2s; animation: nb-emo-float 3s ease-in-out infinite; }
          .nb-emo:hover .nb-emo-emoji { transform: scale(1.18) rotate(-4deg); }
          .nb-emo-pressed .nb-emo-emoji { animation: nb-emo-pop .36s ease forwards; }
        `}</style>
        <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 14 }}>
          ¿Cómo te sientes hoy? No hay respuestas correctas ni incorrectas 💛
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {emotions.map((e) => (
            <button
              key={e.label}
              onClick={() => pickEmotion(e)}
              className={pressing === e.label ? 'nb-emo nb-emo-pressed' : 'nb-emo'}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '16px 6px', borderRadius: 18, border: 'none', cursor: 'pointer',
                background: e.tone === 'bien'
                  ? 'linear-gradient(160deg, #ffffff, #eafaf7)'
                  : 'linear-gradient(160deg, #ffffff, #fdeef3)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.10)'
              }}
            >
              <span className="nb-emo-emoji" style={{ fontSize: 40, lineHeight: 1 }}>{e.emoji}</span>
              <span style={{ fontSize: 13, color: '#2b2b55', fontWeight: 600 }}>{e.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={backBtn}>Volver</button>
      </>
    );
  }

  if (step === 'intensity') {
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 48 }}>{selected?.emoji}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2b2b55' }}>{selected?.label}</div>
        </div>
        <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 14 }}>¿Qué tan fuerte lo sientes?</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ v: 1, t: 'Poquito' }, { v: 2, t: 'Medio' }, { v: 3, t: 'Mucho' }].map((opt) => (
            <button key={opt.v} onClick={() => confirmIntensity(opt.v)} style={{
              flex: 1, padding: '14px 6px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: tone, color: '#fff', fontWeight: 600, fontSize: 14
            }}>{opt.t}</button>
          ))}
        </div>
        <button onClick={() => setStep('select')} style={backBtn}>Atrás</button>
      </>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 48 }}>{selected?.emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2b2b55' }}>{selected?.label}</div>
      </div>
      <div style={{ background: `${tone}18`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <p style={{ margin: '0 0 10px', color: '#2b2b55', lineHeight: 1.5 }}>{selected?.message}</p>
        <p style={{ margin: 0, color: '#6b6b85', fontSize: 14, lineHeight: 1.5 }}>
          <strong style={{ color: tone }}>Idea:</strong> {selected?.tip}
        </p>
      </div>
      <button onClick={restart} style={backBtn}>Registrar otra emoción</button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>Completar actividad</button>
      <button onClick={onClose} style={backBtn}>Volver</button>
    </>
  );
}

// Temporizador genérico
function TimerExercise({ activity, onClose, onComplete }: BodyProps) {
  const totalSeconds = activity.duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => { if (s <= 1) { setRunning(false); setFinished(true); return 0; } return s - 1; });
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

export default function ActivityScreen({ activity, onClose, onComplete, childAge, childLevel, onEmotionLog }: BodyProps) {
  const isBreathing = activity.title.includes('Respiración');
  const isMemory = activity.title.toLowerCase().includes('memoria');
  const isSensory = activity.title.toLowerCase().includes('sensorial');
  const isEmotions = activity.title.toLowerCase().includes('emociones');

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
          : isMemory
          ? <MemoryGame activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} childLevel={childLevel} />
          : isSensory
          ? <SensoryBubbles activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} />
          : isEmotions
          ? <EmotionDiary activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} onEmotionLog={onEmotionLog} />
          : <TimerExercise activity={activity} onClose={onClose} onComplete={onComplete} />}
      </div>
    </div>
  );
}
