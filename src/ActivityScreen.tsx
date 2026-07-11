import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from './lib/i18n';

export interface ActivityInfo {
  id: string;
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
  const { t } = useTranslation();
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
  let phaseLabel = t('act.breath.ready'), phaseCount = 0, scale = 0.9, transitionSeconds = 0.5;
  if (finished) { phaseLabel = t('act.breath.wellDone'); scale = 1; }
  else if (started) {
    if (elapsed < 4) { phaseLabel = t('act.breath.inhale'); phaseCount = 4 - elapsed; scale = 1.5; transitionSeconds = 4; }
    else if (elapsed < 11) { phaseLabel = t('act.breath.hold'); phaseCount = 11 - elapsed; scale = 1.5; transitionSeconds = 0.5; }
    else { phaseLabel = t('act.breath.exhale'); phaseCount = 19 - elapsed; scale = 0.6; transitionSeconds = 8; }
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
        {finished ? t('act.breath.done') : t('act.breath.cycle', { n: cycle, total: TOTAL_CYCLES })}
      </p>
      {!finished && (
        <button onClick={() => setRunning((r) => !r)} style={primaryBtn(activity.color)}>
          {running ? t('act.pause') : started ? t('act.continue') : t('act.start')}
        </button>
      )}
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
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
  const { t } = useTranslation();
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
        <span style={{ display: 'inline-block', background: `${activity.color}22`, color: activity.color, fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 999 }}>{t('act.level', { n: level })}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b6b85', fontSize: 14, marginBottom: 12 }}>
        <span>{t('act.mem.pairs')}: {matchedCount / 2} / {cards.length / 2}</span>
        <span>{t('act.mem.tries')}: {moves}</span>
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
          {t('act.mem.win', { moves })}{finalSeconds !== null ? ` · ${finalSeconds}s` : ''}
        </p>
      )}
      <button onClick={restart} style={backBtn}>{t('act.restart')}</button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
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
  const { t } = useTranslation();
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
        {t('act.bubbles.intro')}
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
          {t('act.bubbles.count')}: {popped}
        </div>
      </div>
      <button onClick={() => setMuted((m) => !m)} style={backBtn}>
        {muted ? t('act.bubbles.soundOff') : t('act.bubbles.soundOn')}
      </button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
    </>
  );
}

// Diario de emociones (check-in emocional)
interface Emotion { emoji: string; label: string; tone: 'bien' | 'dificil'; message: string; tip: string; }

const EMOTIONS: Record<string, Emotion[]> = {
  es: [
    { emoji: '😊', label: 'Feliz', tone: 'bien', message: '¡Qué lindo sentirse feliz! Disfruta este momento.', tip: 'Comparte tu alegría con alguien que quieres.' },
    { emoji: '😌', label: 'Tranquilo', tone: 'bien', message: 'Sentirse en calma es algo muy bueno.', tip: 'Guarda esta sensación; puedes volver a ella cuando la necesites.' },
    { emoji: '😢', label: 'Triste', tone: 'dificil', message: 'Está bien sentirse triste, le pasa a todas las personas.', tip: 'Habla con alguien de confianza o haz un dibujo de cómo te sientes.' },
    { emoji: '😠', label: 'Enojado', tone: 'dificil', message: 'El enojo es normal. Vamos a soltarlo de a poquito.', tip: 'Respira despacio 3 veces o abraza un cojín con suavidad.' },
    { emoji: '😨', label: 'Asustado', tone: 'dificil', message: 'El miedo nos avisa para cuidarnos. Aquí estás a salvo.', tip: 'Respira hondo y cuéntale tu miedo a un adulto de confianza.' },
    { emoji: '😴', label: 'Cansado', tone: 'dificil', message: 'Tu cuerpo te pide descanso. Vale la pena escucharlo.', tip: 'Busca un momento tranquilo para recargar energías.' },
    { emoji: '😰', label: 'Nervioso', tone: 'dificil', message: 'Sentir nervios antes de algo importante es normal.', tip: 'Respira lento; la actividad de Burbujas de calma puede ayudarte.' },
    { emoji: '😤', label: 'Frustrado', tone: 'dificil', message: 'La frustración aparece cuando algo cuesta. Es parte de aprender.', tip: 'Tómate un descanso corto y vuelve a intentarlo con calma.' },
    { emoji: '🤩', label: 'Emocionado', tone: 'bien', message: '¡La emoción es energía buena!', tip: 'Cuéntale a alguien qué te emociona tanto.' }
  ],
  en: [
    { emoji: '😊', label: 'Happy', tone: 'bien', message: 'How nice to feel happy! Enjoy this moment.', tip: 'Share your joy with someone you love.' },
    { emoji: '😌', label: 'Calm', tone: 'bien', message: 'Feeling calm is a wonderful thing.', tip: 'Keep this feeling; you can return to it whenever you need.' },
    { emoji: '😢', label: 'Sad', tone: 'dificil', message: 'It is okay to feel sad, it happens to everyone.', tip: 'Talk to someone you trust or draw how you feel.' },
    { emoji: '😠', label: 'Angry', tone: 'dificil', message: 'Anger is normal. Let us release it little by little.', tip: 'Breathe slowly 3 times or gently hug a cushion.' },
    { emoji: '😨', label: 'Scared', tone: 'dificil', message: 'Fear warns us to take care. You are safe here.', tip: 'Take a deep breath and tell your fear to a trusted grown-up.' },
    { emoji: '😴', label: 'Tired', tone: 'dificil', message: 'Your body is asking for rest. It is worth listening.', tip: 'Find a quiet moment to recharge.' },
    { emoji: '😰', label: 'Nervous', tone: 'dificil', message: 'Feeling nervous before something important is normal.', tip: 'Breathe slowly; the Calm Bubbles activity can help.' },
    { emoji: '😤', label: 'Frustrated', tone: 'dificil', message: 'Frustration shows up when something is hard. It is part of learning.', tip: 'Take a short break and try again calmly.' },
    { emoji: '🤩', label: 'Excited', tone: 'bien', message: 'Excitement is good energy!', tip: 'Tell someone what excites you so much.' }
  ],
  pt: [
    { emoji: '😊', label: 'Feliz', tone: 'bien', message: 'Que bom se sentir feliz! Aproveite este momento.', tip: 'Compartilhe sua alegria com alguém que você ama.' },
    { emoji: '😌', label: 'Tranquilo', tone: 'bien', message: 'Sentir-se calmo é algo muito bom.', tip: 'Guarde esta sensação; você pode voltar a ela quando precisar.' },
    { emoji: '😢', label: 'Triste', tone: 'dificil', message: 'Tudo bem se sentir triste, acontece com todo mundo.', tip: 'Fale com alguém de confiança ou faça um desenho de como se sente.' },
    { emoji: '😠', label: 'Bravo', tone: 'dificil', message: 'A raiva é normal. Vamos soltá-la aos poucos.', tip: 'Respire devagar 3 vezes ou abrace uma almofada com carinho.' },
    { emoji: '😨', label: 'Assustado', tone: 'dificil', message: 'O medo nos avisa para nos cuidar. Aqui você está seguro.', tip: 'Respire fundo e conte seu medo a um adulto de confiança.' },
    { emoji: '😴', label: 'Cansado', tone: 'dificil', message: 'Seu corpo está pedindo descanso. Vale a pena ouvir.', tip: 'Procure um momento tranquilo para recarregar as energias.' },
    { emoji: '😰', label: 'Nervoso', tone: 'dificil', message: 'Sentir nervos antes de algo importante é normal.', tip: 'Respire devagar; a atividade Bolhas de calma pode ajudar.' },
    { emoji: '😤', label: 'Frustrado', tone: 'dificil', message: 'A frustração aparece quando algo é difícil. Faz parte de aprender.', tip: 'Faça uma pausa curta e tente de novo com calma.' },
    { emoji: '🤩', label: 'Empolgado', tone: 'bien', message: 'A empolgação é uma energia boa!', tip: 'Conte para alguém o que te empolga tanto.' }
  ]
};

function getEmotionsForAge(age: number | undefined, lang: string): Emotion[] {
  const list = EMOTIONS[lang] ?? EMOTIONS.es;
  const a = age ?? 7;
  return a <= 6 ? list.slice(0, 6) : list;
}
function EmotionDiary({ activity, onClose, onComplete, childAge, onEmotionLog }: BodyProps) {
  const { t, lang } = useTranslation();
  const emotions = getEmotionsForAge(childAge, lang);
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
          {t('act.emo.prompt')}
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
        <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
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
        <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 14 }}>{t('act.emo.intensity')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ v: 1, t: t('act.emo.low') }, { v: 2, t: t('act.emo.med') }, { v: 3, t: t('act.emo.high') }].map((opt) => (
            <button key={opt.v} onClick={() => confirmIntensity(opt.v)} style={{
              flex: 1, padding: '14px 6px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: tone, color: '#fff', fontWeight: 600, fontSize: 14
            }}>{opt.t}</button>
          ))}
        </div>
        <button onClick={() => setStep('select')} style={backBtn}>{t('act.previous')}</button>
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
          <strong style={{ color: tone }}>{t('act.emo.idea')}:</strong> {selected?.tip}
        </p>
      </div>
      <button onClick={restart} style={backBtn}>{t('act.emo.another')}</button>
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
    </>
  );
}

// Tiempo de movimiento (rutina guiada)
interface Move { emoji: string; name: string; instruction: string; seconds: number; }

const MOVES_YOUNG: Record<string, Move[]> = {
  es: [
    { emoji: '🦘', name: 'Saltos de canguro', instruction: 'Salta suave en tu lugar.', seconds: 12 },
    { emoji: '⭐', name: 'Estírate como estrella', instruction: 'Abre brazos y piernas bien grande.', seconds: 12 },
    { emoji: '🐻', name: 'Camina como oso', instruction: 'Apoya manos y pies y camina despacio.', seconds: 12 },
    { emoji: '🐢', name: 'Tortuga lenta', instruction: 'Muévete muy, muy despacito.', seconds: 12 },
    { emoji: '🌬️', name: 'Respira y descansa', instruction: 'Respira hondo y baja los brazos despacio.', seconds: 14 }
  ],
  en: [
    { emoji: '🦘', name: 'Kangaroo jumps', instruction: 'Jump gently in place.', seconds: 12 },
    { emoji: '⭐', name: 'Stretch like a star', instruction: 'Open your arms and legs really wide.', seconds: 12 },
    { emoji: '🐻', name: 'Walk like a bear', instruction: 'Put hands and feet down and walk slowly.', seconds: 12 },
    { emoji: '🐢', name: 'Slow turtle', instruction: 'Move very, very slowly.', seconds: 12 },
    { emoji: '🌬️', name: 'Breathe and rest', instruction: 'Breathe deep and lower your arms slowly.', seconds: 14 }
  ],
  pt: [
    { emoji: '🦘', name: 'Pulos de canguru', instruction: 'Pule suave no seu lugar.', seconds: 12 },
    { emoji: '⭐', name: 'Estique como estrela', instruction: 'Abra os braços e as pernas bem grande.', seconds: 12 },
    { emoji: '🐻', name: 'Ande como urso', instruction: 'Apoie mãos e pés e ande devagar.', seconds: 12 },
    { emoji: '🐢', name: 'Tartaruga lenta', instruction: 'Mova-se muito, muito devagar.', seconds: 12 },
    { emoji: '🌬️', name: 'Respire e descanse', instruction: 'Respire fundo e abaixe os braços devagar.', seconds: 14 }
  ]
};

const MOVES_OLDER: Record<string, Move[]> = {
  es: [
    { emoji: '🦘', name: 'Saltos de canguro', instruction: 'Salta en tu lugar con energía.', seconds: 12 },
    { emoji: '⭐', name: 'Estrella que abre y cierra', instruction: 'Abre brazos y piernas, y vuelve a juntarlos.', seconds: 12 },
    { emoji: '🙆', name: 'Cielo y suelo', instruction: 'Estírate hacia el cielo y baja a tocar tus pies.', seconds: 12 },
    { emoji: '🐻', name: 'Caminata de oso', instruction: 'Camina con manos y pies en el piso.', seconds: 12 },
    { emoji: '🦋', name: 'Alas de mariposa', instruction: 'Mueve los brazos como alas, lento y luego rápido.', seconds: 12 },
    { emoji: '🐢', name: 'Tortuga lenta', instruction: 'Muévete muy despacio para ir calmándote.', seconds: 12 },
    { emoji: '🧘', name: 'Calma final', instruction: 'Quédate quieto y siente tu respiración.', seconds: 15 }
  ],
  en: [
    { emoji: '🦘', name: 'Kangaroo jumps', instruction: 'Jump in place with energy.', seconds: 12 },
    { emoji: '⭐', name: 'Star open and close', instruction: 'Open your arms and legs, then bring them back together.', seconds: 12 },
    { emoji: '🙆', name: 'Sky and ground', instruction: 'Reach up to the sky and bend down to touch your feet.', seconds: 12 },
    { emoji: '🐻', name: 'Bear walk', instruction: 'Walk with your hands and feet on the floor.', seconds: 12 },
    { emoji: '🦋', name: 'Butterfly wings', instruction: 'Move your arms like wings, slow and then fast.', seconds: 12 },
    { emoji: '🐢', name: 'Slow turtle', instruction: 'Move very slowly to start calming down.', seconds: 12 },
    { emoji: '🧘', name: 'Final calm', instruction: 'Stay still and feel your breathing.', seconds: 15 }
  ],
  pt: [
    { emoji: '🦘', name: 'Pulos de canguru', instruction: 'Pule no seu lugar com energia.', seconds: 12 },
    { emoji: '⭐', name: 'Estrela abre e fecha', instruction: 'Abra os braços e as pernas, e junte novamente.', seconds: 12 },
    { emoji: '🙆', name: 'Céu e chão', instruction: 'Estique para o céu e abaixe para tocar os pés.', seconds: 12 },
    { emoji: '🐻', name: 'Caminhada do urso', instruction: 'Ande com as mãos e os pés no chão.', seconds: 12 },
    { emoji: '🦋', name: 'Asas de borboleta', instruction: 'Mova os braços como asas, devagar e depois rápido.', seconds: 12 },
    { emoji: '🐢', name: 'Tartaruga lenta', instruction: 'Mova-se bem devagar para se acalmar.', seconds: 12 },
    { emoji: '🧘', name: 'Calma final', instruction: 'Fique parado e sinta sua respiração.', seconds: 15 }
  ]
};

function getMovesForAge(age: number | undefined, lang: string): Move[] {
  const a = age ?? 7;
  const table = a <= 6 ? MOVES_YOUNG : MOVES_OLDER;
  return table[lang] ?? table.es;
}
function MovementRoutine({ activity, onClose, onComplete, childAge }: BodyProps) {
  const { t, lang } = useTranslation();
  const moves = getMovesForAge(childAge, lang);
  const [phase, setPhase] = useState<'intro' | 'countdown' | 'running' | 'rest' | 'done'>('intro');
  const [index, setIndex] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Cada ejercicio dura ~20s; el último (calma final) un poco más.
  const moveSeconds = (i: number) => (i === moves.length - 1 ? 25 : 20);
  const isLast = index + 1 >= moves.length;

  // Cuenta regresiva 3-2-1 antes de cada ejercicio
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setSecondsLeft(moveSeconds(index));
      setRunning(true);
      setPhase('running');
      return;
    }
    const id = window.setTimeout(() => setCountdownNum((n) => n - 1), 800);
    return () => window.clearTimeout(id);
  }, [phase, countdownNum, index]);

  // Temporizador del ejercicio
  useEffect(() => {
    if (phase !== 'running' || !running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [phase, running]);

  // Al terminar el tiempo: pasa a "descanso" (NO salta solo al siguiente)
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) {
      setRunning(false);
      setPhase('rest');
    }
  }, [phase, secondsLeft]);

  const start = () => { setIndex(0); setCountdownNum(3); setPhase('countdown'); };
  const goNext = () => {
    const ni = index + 1;
    if (ni >= moves.length) { setPhase('done'); }
    else { setIndex(ni); setCountdownNum(3); setPhase('countdown'); }
  };

  if (phase === 'intro') {
    return (
      <>
        <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {t('act.move.intro')}
        </p>
        <p style={{ textAlign: 'center', color: '#2b2b55', fontWeight: 600, marginBottom: 16 }}>{t('act.move.count', { n: moves.length })}</p>
        <button onClick={start} style={primaryBtn(activity.color)}>{t('act.start')}</button>
        <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  if (phase === 'countdown') {
    const move = moves[index];
    return (
      <>
        <style>{`@keyframes nb-count-pop { 0% { transform: scale(0.4); opacity: 0; } 40% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
        <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 14, marginBottom: 4 }}>{t('act.move.getReady')}</p>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 48 }}>{move.emoji}</div>
          <h3 style={{ margin: '6px 0 0', color: '#2b2b55' }}>{move.name}</h3>
        </div>
        <div key={countdownNum} style={{ fontSize: 96, fontWeight: 800, color: activity.color, textAlign: 'center', lineHeight: 1.1, margin: '4px 0 16px', animation: 'nb-count-pop 0.4s ease' }}>
          {countdownNum > 0 ? countdownNum : t('act.move.go')}
        </div>
        <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  if (phase === 'rest') {
    const move = moves[index];
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <p style={{ color: '#2e9e5b', fontWeight: 700, fontSize: 18, margin: '8px 0 2px' }}>{t('act.move.wellDone')}</p>
          <p style={{ color: '#6b6b85', margin: 0 }}>{move.name}</p>
        </div>
        <button onClick={goNext} style={primaryBtn(activity.color)}>
          {isLast ? t('act.move.finish') : t('act.move.nextReady')}
        </button>
        <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  if (phase === 'done') {
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 56 }}>🎉</div>
          <p style={{ color: '#2e9e5b', fontWeight: 700, fontSize: 18, margin: '8px 0' }}>{t('act.move.done')}</p>
          <p style={{ color: '#6b6b85', lineHeight: 1.5 }}>{t('act.move.doneMsg')}</p>
        </div>
        <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
        <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  const move = moves[index];
  const dur = moveSeconds(index);
  const progress = Math.round(((dur - secondsLeft) / dur) * 100);
  return (
    <>
      <style>{`@keyframes nb-move-bounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.08); } }`}</style>
      <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 13, marginBottom: 6 }}>{t('act.move.step', { i: index + 1, n: moves.length })}</p>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 72, animation: running ? 'nb-move-bounce 1s ease-in-out infinite' : undefined, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.22))' }}>{move.emoji}</div>
        <h3 style={{ margin: '8px 0 4px', color: '#2b2b55' }}>{move.name}</h3>
        <p style={{ color: '#6b6b85', margin: 0, lineHeight: 1.5 }}>{move.instruction}</p>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: activity.color, textAlign: 'center', marginBottom: 6 }}>{secondsLeft}s</div>
      <div style={{ height: 8, background: '#eeeeee', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: activity.color, transition: 'width 0.3s' }} />
      </div>
      <button onClick={() => setRunning((r) => !r)} style={primaryBtn(activity.color)}>{running ? t('act.pause') : t('act.continue')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
    </>
  );
}

// Lectura guiada (cuento + comprensión)
interface Question { q: string; options: string[]; correct: number; }
interface Story { title: string; emoji: string; text: string[]; questions: Question[]; }

const STORIES_YOUNG: Record<string, Story[]> = {
  es: [
    { title: 'El pato que aprendió a nadar', emoji: '🦆', text: [
      'Lucas era un patito pequeño. Le daba miedo el agua.',
      'Un día, su mamá lo llevó al lago. Lucas metió una patita, y luego la otra.',
      '¡Y empezó a nadar! Lucas estaba muy feliz.'
    ], questions: [
      { q: '¿Quién es Lucas?', options: ['Un patito', 'Un perro', 'Un pez'], correct: 0 },
      { q: '¿Qué sentía Lucas al principio?', options: ['Miedo', 'Hambre', 'Sueño'], correct: 0 }
    ] },
    { title: 'La semilla valiente', emoji: '🌱', text: [
      'María plantó una semilla en una maceta.',
      'Todos los días le daba agua y esperaba con paciencia.',
      'Una mañana vio algo verde. ¡La semilla se convirtió en una flor! María sonrió.'
    ], questions: [
      { q: '¿Qué plantó María?', options: ['Una semilla', 'Una piedra', 'Un juguete'], correct: 0 },
      { q: '¿En qué se convirtió la semilla?', options: ['En una flor', 'En un pájaro', 'En una fruta'], correct: 0 }
    ] }
  ],
  en: [
    { title: 'The duck who learned to swim', emoji: '🦆', text: [
      'Lucas was a little duckling. He was afraid of the water.',
      'One day, his mom took him to the lake. Lucas put in one little foot, and then the other.',
      'And he started to swim! Lucas was very happy.'
    ], questions: [
      { q: 'Who is Lucas?', options: ['A duckling', 'A dog', 'A fish'], correct: 0 },
      { q: 'What did Lucas feel at first?', options: ['Fear', 'Hunger', 'Sleepiness'], correct: 0 }
    ] },
    { title: 'The brave seed', emoji: '🌱', text: [
      'Maria planted a seed in a pot.',
      'Every day she gave it water and waited patiently.',
      'One morning she saw something green. The seed became a flower! Maria smiled.'
    ], questions: [
      { q: 'What did Maria plant?', options: ['A seed', 'A stone', 'A toy'], correct: 0 },
      { q: 'What did the seed become?', options: ['A flower', 'A bird', 'A fruit'], correct: 0 }
    ] }
  ],
  pt: [
    { title: 'O patinho que aprendeu a nadar', emoji: '🦆', text: [
      'Lucas era um patinho pequeno. Ele tinha medo da água.',
      'Um dia, sua mãe o levou ao lago. Lucas colocou uma patinha, e depois a outra.',
      'E começou a nadar! Lucas ficou muito feliz.'
    ], questions: [
      { q: 'Quem é o Lucas?', options: ['Um patinho', 'Um cachorro', 'Um peixe'], correct: 0 },
      { q: 'O que o Lucas sentia no começo?', options: ['Medo', 'Fome', 'Sono'], correct: 0 }
    ] },
    { title: 'A semente corajosa', emoji: '🌱', text: [
      'Maria plantou uma semente em um vaso.',
      'Todos os dias dava água e esperava com paciência.',
      'Uma manhã viu algo verde. A semente virou uma flor! Maria sorriu.'
    ], questions: [
      { q: 'O que a Maria plantou?', options: ['Uma semente', 'Uma pedra', 'Um brinquedo'], correct: 0 },
      { q: 'No que a semente se transformou?', options: ['Em uma flor', 'Em um pássaro', 'Em uma fruta'], correct: 0 }
    ] }
  ]
};

const STORIES_OLDER: Record<string, Story[]> = {
  es: [
    { title: 'El puente de la amistad', emoji: '🌉', text: [
      'Tomás era nuevo en la escuela. En el recreo se sentaba solo, porque todavía no conocía a nadie.',
      'Un niño llamado Diego lo vio y se acercó. Le ofreció compartir su pelota, y jugaron juntos toda la tarde.',
      'Desde ese día, Tomás ya no se sintió solo. Aprendió que un pequeño gesto puede empezar una gran amistad.'
    ], questions: [
      { q: '¿Por qué Tomás estaba solo?', options: ['Era nuevo y no conocía a nadie', 'No le gustaba jugar', 'Estaba enojado'], correct: 0 },
      { q: '¿Qué hizo Diego?', options: ['Le ofreció compartir su pelota', 'Se rió de él', 'Se fue corriendo'], correct: 0 },
      { q: '¿Qué aprendió Tomás?', options: ['Un pequeño gesto puede empezar una amistad', 'Que jugar es aburrido', 'Que es mejor estar solo'], correct: 0 }
    ] },
    { title: 'La colina de Sara', emoji: '⛰️', text: [
      'Sara quería llegar a la cima de una colina. El camino era largo y pronto se cansó.',
      'Pensó en rendirse, pero respiró hondo y dio un paso más. Luego otro, y otro.',
      'Poco a poco llegó a la cima y vio un paisaje hermoso. Sara entendió que las cosas difíciles se logran paso a paso.'
    ], questions: [
      { q: '¿Qué quería lograr Sara?', options: ['Llegar a la cima de una colina', 'Nadar en un río', 'Ganar una carrera'], correct: 0 },
      { q: '¿Qué pensó hacer cuando se cansó?', options: ['Rendirse', 'Correr más rápido', 'Gritar'], correct: 0 },
      { q: '¿Qué entendió al final?', options: ['Las cosas difíciles se logran paso a paso', 'Que subir es imposible', 'Que es mejor no intentar'], correct: 0 }
    ] }
  ],
  en: [
    { title: 'The friendship bridge', emoji: '🌉', text: [
      'Tomas was new at school. At recess he sat alone, because he did not know anyone yet.',
      'A boy named Diego saw him and came over. He offered to share his ball, and they played together all afternoon.',
      'From that day on, Tomas no longer felt alone. He learned that a small gesture can begin a great friendship.'
    ], questions: [
      { q: 'Why was Tomas alone?', options: ['He was new and did not know anyone', 'He did not like to play', 'He was angry'], correct: 0 },
      { q: 'What did Diego do?', options: ['He offered to share his ball', 'He laughed at him', 'He ran away'], correct: 0 },
      { q: 'What did Tomas learn?', options: ['A small gesture can begin a friendship', 'That playing is boring', 'That it is better to be alone'], correct: 0 }
    ] },
    { title: 'Sara and the hill', emoji: '⛰️', text: [
      'Sara wanted to reach the top of a hill. The path was long and she soon got tired.',
      'She thought about giving up, but she took a deep breath and took one more step. Then another, and another.',
      'Little by little she reached the top and saw a beautiful view. Sara understood that hard things are achieved step by step.'
    ], questions: [
      { q: 'What did Sara want to achieve?', options: ['To reach the top of a hill', 'To swim in a river', 'To win a race'], correct: 0 },
      { q: 'What did she think of doing when she got tired?', options: ['Giving up', 'Running faster', 'Shouting'], correct: 0 },
      { q: 'What did she understand at the end?', options: ['Hard things are achieved step by step', 'That climbing is impossible', 'That it is better not to try'], correct: 0 }
    ] }
  ],
  pt: [
    { title: 'A ponte da amizade', emoji: '🌉', text: [
      'Tomás era novo na escola. No recreio sentava sozinho, porque ainda não conhecia ninguém.',
      'Um menino chamado Diego o viu e se aproximou. Ofereceu compartilhar sua bola, e brincaram juntos a tarde toda.',
      'A partir daquele dia, Tomás não se sentiu mais sozinho. Aprendeu que um pequeno gesto pode começar uma grande amizade.'
    ], questions: [
      { q: 'Por que o Tomás estava sozinho?', options: ['Era novo e não conhecia ninguém', 'Não gostava de brincar', 'Estava bravo'], correct: 0 },
      { q: 'O que o Diego fez?', options: ['Ofereceu compartilhar sua bola', 'Riu dele', 'Saiu correndo'], correct: 0 },
      { q: 'O que o Tomás aprendeu?', options: ['Um pequeno gesto pode começar uma amizade', 'Que brincar é chato', 'Que é melhor ficar sozinho'], correct: 0 }
    ] },
    { title: 'A colina da Sara', emoji: '⛰️', text: [
      'Sara queria chegar ao topo de uma colina. O caminho era longo e logo ela se cansou.',
      'Pensou em desistir, mas respirou fundo e deu mais um passo. Depois outro, e outro.',
      'Aos poucos chegou ao topo e viu uma paisagem linda. Sara entendeu que as coisas difíceis se conquistam passo a passo.'
    ], questions: [
      { q: 'O que a Sara queria alcançar?', options: ['Chegar ao topo de uma colina', 'Nadar em um rio', 'Ganhar uma corrida'], correct: 0 },
      { q: 'O que ela pensou em fazer quando se cansou?', options: ['Desistir', 'Correr mais rápido', 'Gritar'], correct: 0 },
      { q: 'O que ela entendeu no final?', options: ['As coisas difíceis se conquistam passo a passo', 'Que subir é impossível', 'Que é melhor não tentar'], correct: 0 }
    ] }
  ]
};

function pickStory(age: number | undefined, lang: string): Story {
  const a = age ?? 7;
  const table = a <= 6 ? STORIES_YOUNG : STORIES_OLDER;
  const pool = table[lang] ?? table.es;
  return pool[Math.floor(Math.random() * pool.length)];
}
function GuidedReading({ activity, onClose, onComplete, childAge }: BodyProps) {
  const { t, lang } = useTranslation();
  const [story] = useState(() => pickStory(childAge, lang));
  const [phase, setPhase] = useState<'read' | 'quiz' | 'done'>('read');
  const [qIndex, setQIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctCount, setCorrectCount] = useState(0);

  const stopSpeech = () => { try { window.speechSynthesis.cancel(); } catch { /* nada */ } };
  useEffect(() => stopSpeech, []);

  const speak = () => {
    try {
      stopSpeech();
      const u = new SpeechSynthesisUtterance(story.text.join(' '));
      u.lang = ({ es: 'es-ES', en: 'en-US', pt: 'pt-BR' } as Record<string, string>)[lang] ?? 'es-ES';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch { /* nada */ }
  };

  const close = () => { stopSpeech(); onClose(); };

  const answer = (optIndex: number) => {
    if (status === 'correct') return;
    if (optIndex === story.questions[qIndex].correct) {
      setStatus('correct');
      setCorrectCount((c) => c + 1);
    } else {
      setStatus('wrong');
    }
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= story.questions.length) {
      setPhase('done');
    } else {
      setQIndex((i) => i + 1);
      setStatus('idle');
    }
  };

  if (phase === 'read') {
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 48 }}>{story.emoji}</div>
          <h3 style={{ margin: '6px 0 0', color: '#2b2b55' }}>{story.title}</h3>
        </div>
        <div style={{ background: '#faf9ff', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          {story.text.map((p, i) => (
            <p key={i} style={{ fontSize: 18, lineHeight: 1.9, letterSpacing: '0.3px', color: '#2b2b55', margin: i === 0 ? 0 : '12px 0 0' }}>{p}</p>
          ))}
        </div>
        <button onClick={speak} style={backBtn}>{t('act.read.listen')}</button>
        <button onClick={() => setPhase('quiz')} style={primaryBtn(activity.color)}>{t('act.read.toQuestions')}</button>
        <button onClick={close} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  if (phase === 'done') {
    const total = story.questions.length;
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 56 }}>🌟</div>
          <p style={{ color: '#2e9e5b', fontWeight: 700, fontSize: 18, margin: '8px 0' }}>{t('act.read.done')}</p>
          <p style={{ color: '#6b6b85', lineHeight: 1.5 }}>{t('act.read.score', { n: correctCount, total })}</p>
        </div>
        <button onClick={() => { onComplete(activity); close(); }} style={completeBtn}>{t('act.complete')}</button>
        <button onClick={close} style={backBtn}>{t('act.back')}</button>
      </>
    );
  }

  const question = story.questions[qIndex];
  return (
    <>
      <p style={{ textAlign: 'center', color: '#6b6b85', fontSize: 13, marginBottom: 8 }}>{t('act.read.question', { i: qIndex + 1, n: story.questions.length })}</p>
      <h3 style={{ textAlign: 'center', color: '#2b2b55', margin: '0 0 16px', lineHeight: 1.4 }}>{question.q}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {question.options.map((opt, i) => {
          const isCorrect = status !== 'idle' && i === question.correct;
          return (
            <button key={i} onClick={() => answer(i)} disabled={status === 'correct'} style={{
              padding: 14, borderRadius: 14,
              border: isCorrect ? '2px solid #2e9e5b' : '1px solid #dddddd',
              background: isCorrect ? '#e7f7ee' : '#fff', color: '#2b2b55',
              fontSize: 15, textAlign: 'left', cursor: status === 'correct' ? 'default' : 'pointer'
            }}>{opt}</button>
          );
        })}
      </div>
      {status === 'correct' && (
        <>
          <p style={{ textAlign: 'center', color: '#2e9e5b', fontWeight: 700, marginBottom: 10 }}>{t('act.read.correct')}</p>
          <button onClick={nextQuestion} style={primaryBtn(activity.color)}>
            {qIndex + 1 >= story.questions.length ? t('act.read.seeResult') : t('act.read.nextQuestion')}
          </button>
        </>
      )}
      {status === 'wrong' && (
        <p style={{ textAlign: 'center', color: '#e08a00', marginBottom: 10 }}>{t('act.read.wrong')}</p>
      )}
      <button onClick={close} style={backBtn}>{t('act.back')}</button>
    </>
  );
}

// Temporizador genérico
function TimerExercise({ activity, onClose, onComplete }: BodyProps) {
  const { t } = useTranslation();
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
        <p style={{ color: '#2e9e5b', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>{t('act.timer.done')}</p>
      ) : (
        <button onClick={() => setRunning((r) => !r)} style={primaryBtn(activity.color)}>
          {running ? t('act.pause') : secondsLeft === totalSeconds ? t('act.start') : t('act.continue')}
        </button>
      )}
      <button onClick={() => { onComplete(activity); onClose(); }} style={completeBtn}>{t('act.complete')}</button>
      <button onClick={onClose} style={backBtn}>{t('act.back')}</button>
    </>
  );
}

export default function ActivityScreen({ activity, onClose, onComplete, childAge, childLevel, onEmotionLog }: BodyProps) {
  const { t } = useTranslation();
  const isBreathing = activity.title.includes('Respiración');
  const isMemory = activity.title.toLowerCase().includes('memoria');
  const isSensory = activity.title.toLowerCase().includes('sensorial');
  const isEmotions = activity.title.toLowerCase().includes('emociones');
  const isMovement = activity.title.toLowerCase().includes('movimiento');
  const isReading = activity.title.toLowerCase().includes('lectura');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(25, 25, 50, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `${activity.color}22` }}>{activity.icon}</div>
          <span style={{ display: 'inline-block', background: activity.color, color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, marginBottom: 10 }}>{t(`cat.${activity.category}`)}</span>
          <h2 style={{ margin: '4px 0 8px', color: '#2b2b55' }}>{t(`act.title.${activity.id}`)}</h2>
          <p style={{ color: '#6b6b85', margin: 0, lineHeight: 1.5 }}>{t(`act.desc.${activity.id}`)}</p>
        </div>
        {isBreathing
          ? <BreathingExercise activity={activity} onClose={onClose} onComplete={onComplete} />
          : isMemory
          ? <MemoryGame activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} childLevel={childLevel} />
          : isSensory
          ? <SensoryBubbles activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} />
          : isEmotions
          ? <EmotionDiary activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} onEmotionLog={onEmotionLog} />
          : isMovement
          ? <MovementRoutine activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} />
          : isReading
          ? <GuidedReading activity={activity} onClose={onClose} onComplete={onComplete} childAge={childAge} />
          : <TimerExercise activity={activity} onClose={onClose} onComplete={onComplete} />}
      </div>
    </div>
  );
}
