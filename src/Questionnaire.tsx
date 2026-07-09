import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import type {
  QuestionnaireActivityResult,
  QuestionnaireAnswers,
  QuestionnaireInsights,
  QuestionnaireKey,
  UserMetadata
} from './types';

interface QuestionnaireProps {
  userMetadata: UserMetadata;
  onComplete: (metadata: UserMetadata) => void;
}

// ───────────────────────────────────────────────────────────
// Utilidades y tipos base
// ───────────────────────────────────────────────────────────

type ActivityOutcome = { correct: boolean; attempts: number };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ───────────────────────────────────────────────────────────
// Figuras geométricas "3D" (SVG con sombreado)
// ───────────────────────────────────────────────────────────

type ShapeKind = 'cubo' | 'esfera' | 'piramide' | 'cilindro';
type ShapeColor = 'rojo' | 'azul' | 'amarillo' | 'verde' | 'morado' | 'naranja';
type ShapeSpec = { kind: ShapeKind; color: ShapeColor };

const SHAPE_COLORS: Record<ShapeColor, { base: string; dark: string; light: string }> = {
  rojo: { base: '#ef4444', dark: '#b91c1c', light: '#fca5a5' },
  azul: { base: '#3b82f6', dark: '#1d4ed8', light: '#93c5fd' },
  amarillo: { base: '#f59e0b', dark: '#b45309', light: '#fcd34d' },
  verde: { base: '#22c55e', dark: '#15803d', light: '#86efac' },
  morado: { base: '#8b5cf6', dark: '#6d28d9', light: '#c4b5fd' },
  naranja: { base: '#f97316', dark: '#c2410c', light: '#fdba74' }
};

function Shape3D({ kind, color, size = 58 }: { kind: ShapeKind; color: ShapeColor; size?: number }) {
  const c = SHAPE_COLORS[color];
  const gid = `${kind}-${color}`;

  if (kind === 'esfera') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={`sph-${gid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.base} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="52" r="42" fill={`url(#sph-${gid})`} />
      </svg>
    );
  }

  if (kind === 'cubo') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,10 88,30 50,50 12,30" fill={c.light} />
        <polygon points="12,30 50,50 50,92 12,72" fill={c.base} />
        <polygon points="88,30 50,50 50,92 88,72" fill={c.dark} />
      </svg>
    );
  }

  if (kind === 'piramide') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,10 20,84 50,84" fill={c.base} />
        <polygon points="50,10 80,84 50,84" fill={c.dark} />
        <polygon points="50,10 50,84 36,84" fill={c.light} opacity="0.4" />
      </svg>
    );
  }

  // cilindro
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`cyl-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.dark} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="70%" stopColor={c.light} />
          <stop offset="100%" stopColor={c.base} />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="26" rx="28" ry="10" fill={c.light} />
      <rect x="22" y="26" width="56" height="52" fill={`url(#cyl-${gid})`} />
      <ellipse cx="50" cy="78" rx="28" ry="10" fill={c.dark} />
      <ellipse cx="50" cy="26" rx="28" ry="10" fill="none" stroke={c.light} strokeWidth="1" />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────
// Tipos de pasos del cuestionario
// ───────────────────────────────────────────────────────────

type Pair = { id: string; left: string; leftLabel: string; right: string; rightLabel: string };
type CatItem = { emoji: string; label: string; target: boolean };

type Step =
  | { type: 'intro' }
  | {
      type: 'question';
      id: QuestionnaireKey;
      section: string;
      icon: string;
      prompt: string;
      detail: string;
    }
  | {
      type: 'match';
      id: string;
      label: string;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      pairs: Pair[];
      skills: QuestionnaireKey[];
    }
  | {
      type: 'pattern';
      id: string;
      label: string;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      sequence: ShapeSpec[];
      options: ShapeSpec[];
      correctIndex: number;
      skills: QuestionnaireKey[];
    }
  | {
      type: 'category';
      id: string;
      label: string;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      items: CatItem[];
      skills: QuestionnaireKey[];
    }
  | {
      type: 'puzzle';
      id: string;
      label: string;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      grid: (ShapeSpec | null)[];
      options: ShapeSpec[];
      correctIndex: number;
      skills: QuestionnaireKey[];
    }
  | {
      type: 'emotion';
      id: string;
      label: string;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      face: string;
      options: string[];
      correctIndex: number;
      skills: QuestionnaireKey[];
    }
  | { type: 'review' };

const answerOptions: { value: number; label: string; face: string }[] = [
  { value: 1, label: 'Casi nunca', face: '😌' },
  { value: 2, label: 'A veces', face: '🙂' },
  { value: 3, label: 'Seguido', face: '😐' },
  { value: 4, label: 'Muy seguido', face: '😟' },
  { value: 5, label: 'Casi siempre', face: '😣' }
];

const AREA_LABELS: Record<QuestionnaireKey, string> = {
  attention: 'Atención y concentración',
  behavior: 'Energía y autorregulación',
  communication: 'Comunicación social',
  sensory: 'Procesamiento sensorial',
  emotions: 'Regulación emocional',
  learning: 'Aprendizaje y comprensión'
};

// ───────────────────────────────────────────────────────────
// Construcción de pasos (se adapta por edad)
// ───────────────────────────────────────────────────────────

function buildSteps(age: number): Step[] {
  const small = age <= 6;

  const q = (
    id: QuestionnaireKey,
    section: string,
    icon: string,
    prompt: string,
    detail: string
  ): Step => ({ type: 'question', id, section, icon, prompt, detail });

  const matchStep: Step = {
    type: 'match',
    id: 'match-1',
    label: 'Asociación',
    section: 'Asociación y atención',
    icon: '🔗',
    title: small ? 'Une a cada amiguito con lo que le gusta' : 'Une cada elemento con su pareja',
    prompt: 'Tocá primero de la izquierda y luego su pareja de la derecha.',
    pairs: small
      ? [
          { id: 'p1', left: '🐶', leftLabel: 'Perro', right: '🦴', rightLabel: 'Hueso' },
          { id: 'p2', left: '🐱', leftLabel: 'Gato', right: '🐟', rightLabel: 'Pez' },
          { id: 'p3', left: '🐰', leftLabel: 'Conejo', right: '🥕', rightLabel: 'Zanahoria' }
        ]
      : [
          { id: 'p1', left: '🐝', leftLabel: 'Abeja', right: '🌼', rightLabel: 'Flor' },
          { id: 'p2', left: '☀️', leftLabel: 'Sol', right: '🕶️', rightLabel: 'Lentes' },
          { id: 'p3', left: '🌧️', leftLabel: 'Lluvia', right: '☂️', rightLabel: 'Paraguas' },
          { id: 'p4', left: '🔑', leftLabel: 'Llave', right: '🚪', rightLabel: 'Puerta' }
        ],
    skills: ['attention', 'learning']
  };

  const patternEasy: Step = {
    type: 'pattern',
    id: 'pattern-1',
    label: 'Patrón de figuras',
    section: 'Patrones y lógica',
    icon: '🧩',
    title: '¿Qué figura sigue?',
    prompt: 'Mirá la secuencia y elegí la figura que continúa.',
    sequence: [
      { kind: 'esfera', color: 'rojo' },
      { kind: 'cubo', color: 'azul' },
      { kind: 'esfera', color: 'rojo' },
      { kind: 'cubo', color: 'azul' }
    ],
    options: [
      { kind: 'esfera', color: 'rojo' },
      { kind: 'cubo', color: 'azul' },
      { kind: 'piramide', color: 'verde' }
    ],
    correctIndex: 0,
    skills: ['attention', 'attention', 'learning']
  };

  const patternHard: Step = {
    type: 'pattern',
    id: 'pattern-2',
    label: 'Patrón de figuras (avanzado)',
    section: 'Patrones y lógica',
    icon: '🧠',
    title: '¿Qué figura sigue ahora?',
    prompt: 'Esta secuencia usa tres figuras. ¿Cuál continúa?',
    sequence: [
      { kind: 'cubo', color: 'azul' },
      { kind: 'esfera', color: 'amarillo' },
      { kind: 'piramide', color: 'morado' },
      { kind: 'cubo', color: 'azul' },
      { kind: 'esfera', color: 'amarillo' }
    ],
    options: [
      { kind: 'cilindro', color: 'naranja' },
      { kind: 'piramide', color: 'morado' },
      { kind: 'cubo', color: 'azul' }
    ],
    correctIndex: 1,
    skills: ['attention', 'attention', 'learning']
  };

  const categoryStep: Step = {
    type: 'category',
    id: 'category-1',
    label: 'Clasificación',
    section: 'Clasificación y atención',
    icon: '👆',
    title: small ? 'Tocá todos los animalitos' : 'Tocá todas las frutas',
    prompt: 'Seleccioná todas las que correspondan y luego tocá "Listo".',
    items: small
      ? [
          { emoji: '🐶', label: 'Perro', target: true },
          { emoji: '🚗', label: 'Carro', target: false },
          { emoji: '🐱', label: 'Gato', target: true },
          { emoji: '⚽', label: 'Pelota', target: false },
          { emoji: '🐤', label: 'Pollito', target: true },
          { emoji: '🏠', label: 'Casa', target: false }
        ]
      : [
          { emoji: '🍎', label: 'Manzana', target: true },
          { emoji: '🚲', label: 'Bici', target: false },
          { emoji: '🍌', label: 'Banano', target: true },
          { emoji: '✏️', label: 'Lápiz', target: false },
          { emoji: '🍇', label: 'Uvas', target: true },
          { emoji: '🐶', label: 'Perro', target: false },
          { emoji: '🍊', label: 'Naranja', target: true },
          { emoji: '⌚', label: 'Reloj', target: false }
        ],
    skills: ['attention']
  };

  const puzzleStep: Step = {
    type: 'puzzle',
    id: 'puzzle-1',
    label: 'Razonamiento visual',
    section: 'Razonamiento visual',
    icon: '🖼️',
    title: '¿Qué pieza falta?',
    prompt: 'Mirá el cuadro y elegí la pieza que completa el espacio vacío.',
    grid: [
      { kind: 'esfera', color: 'rojo' },
      { kind: 'cubo', color: 'azul' },
      { kind: 'cubo', color: 'azul' },
      null
    ],
    options: [
      { kind: 'esfera', color: 'rojo' },
      { kind: 'piramide', color: 'verde' },
      { kind: 'cubo', color: 'azul' }
    ],
    correctIndex: 0,
    skills: ['learning', 'learning']
  };

  const emotionStep: Step = {
    type: 'emotion',
    id: 'emotion-1',
    label: 'Reconocer emociones',
    section: 'Reconocimiento de emociones',
    icon: '😊',
    title: '¿Cómo se siente?',
    prompt: 'Mirá la carita y elegí cómo se siente.',
    face: small ? '😢' : '😟',
    options: small ? ['Feliz', 'Triste', 'Enojado'] : ['Contento', 'Preocupado', 'Enfadado'],
    correctIndex: small ? 1 : 1,
    skills: ['communication', 'communication', 'emotions']
  };

  const steps: Step[] = [
    { type: 'intro' },
    q(
      'attention',
      'Atención y concentración',
      '🎯',
      '¿Tu hijo/a tiene dificultad para mantener la atención en actividades breves?',
      'Nos ayuda a conocer cómo sostiene la atención en tareas cotidianas.'
    ),
    matchStep,
    patternEasy
  ];

  if (!small) {
    steps.push(patternHard);
  }

  steps.push(
    q(
      'behavior',
      'Energía e impulsividad',
      '⚡',
      '¿Se altera o reacciona con intensidad cuando cambian las rutinas?',
      'Nos ayuda a entender cómo responde a los cambios inesperados.'
    ),
    categoryStep,
    q(
      'sensory',
      'Procesamiento sensorial',
      '🎧',
      '¿Tu hijo/a es sensible a sonidos, texturas, luces o temperaturas?',
      'Nos ayuda a detectar cómo reacciona ante estímulos sensoriales comunes.'
    ),
    puzzleStep,
    q(
      'communication',
      'Comunicación social',
      '🗣️',
      '¿Le cuesta iniciar o mantener interacciones con otras personas?',
      'Nos ayuda a conocer cómo se relaciona con niños y adultos.'
    ),
    emotionStep,
    q(
      'emotions',
      'Regulación emocional',
      '💖',
      '¿Muestra cambios emocionales intensos o se frustra con facilidad?',
      'Nos ayuda a conocer su tolerancia a la frustración.'
    ),
    q(
      'learning',
      'Aprendizaje y comprensión',
      '📘',
      '¿Necesita más tiempo para comprender nuevas instrucciones o conceptos?',
      'Nos ayuda a conocer su ritmo para entender tareas nuevas.'
    ),
    { type: 'review' }
  );

  return steps;
}

const defaultAnswers: QuestionnaireAnswers = {
  attention: 0,
  behavior: 0,
  communication: 0,
  sensory: 0,
  emotions: 0,
  learning: 0
};

// ───────────────────────────────────────────────────────────
// Perfil (compatible con lo anterior) + insights ricos
// ───────────────────────────────────────────────────────────

function enrichScores(answers: QuestionnaireAnswers, boosts: QuestionnaireAnswers): QuestionnaireAnswers {
  return {
    attention: answers.attention + boosts.attention,
    behavior: answers.behavior + boosts.behavior,
    communication: answers.communication + boosts.communication,
    sensory: answers.sensory + boosts.sensory,
    emotions: answers.emotions + boosts.emotions,
    learning: answers.learning + boosts.learning
  };
}

function computeProfile(scores: QuestionnaireAnswers): string {
  const detected: string[] = [];
  if (scores.attention >= 7 && scores.behavior >= 6) detected.push('TDAH');
  if (scores.communication >= 7 && scores.sensory >= 6) detected.push('TEA');
  if (scores.sensory >= 7) detected.push('Procesamiento sensorial');
  if (scores.emotions >= 7) detected.push('Ansiedad');
  if (scores.learning >= 7 && scores.attention <= 5) detected.push('Dislexia');
  if (scores.learning >= 8 && scores.attention >= 6) detected.push('Altas capacidades');

  if (detected.length === 0) {
    return 'Perfil equilibrado con señales de apoyo en aprendizaje y concentración';
  }
  if (detected.length === 1) {
    return `Perfil con énfasis en ${detected[0]}`;
  }
  return `Perfil combinado: ${detected.join(', ')}`;
}

// ───────────────────────────────────────────────────────────
// Componentes de actividad para niños (táctiles, sin arrastrar)
// ───────────────────────────────────────────────────────────

function MatchGame({ pairs, onResult }: { pairs: Pair[]; onResult: (o: ActivityOutcome) => void }) {
  const rights = useMemo(
    () => shuffle(pairs.map((p) => ({ id: p.id, emoji: p.right, name: p.rightLabel }))),
    [pairs]
  );
  const [selLeft, setSelLeft] = useState<string>('');
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [wrongId, setWrongId] = useState<string>('');
  const attemptsRef = useRef(0);
  const doneRef = useRef(false);

  const matchedCount = Object.keys(matched).length;

  useEffect(() => {
    if (!doneRef.current && matchedCount === pairs.length && pairs.length > 0) {
      doneRef.current = true;
      onResult({ correct: true, attempts: attemptsRef.current });
    }
  }, [matchedCount, pairs.length, onResult]);

  const tryMatch = (rightId: string) => {
    if (!selLeft || matched[rightId]) return;
    attemptsRef.current += 1;
    if (selLeft === rightId) {
      setMatched((current) => ({ ...current, [selLeft]: true }));
      setSelLeft('');
    } else {
      setWrongId(rightId);
      window.setTimeout(() => setWrongId(''), 450);
      setSelLeft('');
    }
  };

  return (
    <div className="nb-q-match">
      <div className="nb-q-match-col">
        {pairs.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`nb-q-tile ${selLeft === p.id ? 'sel' : ''} ${matched[p.id] ? 'ok' : ''}`}
            onClick={() => !matched[p.id] && setSelLeft(p.id)}
            disabled={matched[p.id]}
          >
            <span className="nb-q-tile-emoji">{p.left}</span>
            <span className="nb-q-tile-name">{p.leftLabel}</span>
            {matched[p.id] && <span className="nb-q-check">✓</span>}
          </button>
        ))}
      </div>
      <div className="nb-q-match-col">
        {rights.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`nb-q-tile ${matched[r.id] ? 'ok' : ''} ${wrongId === r.id ? 'wrong' : ''}`}
            onClick={() => tryMatch(r.id)}
            disabled={matched[r.id]}
          >
            <span className="nb-q-tile-emoji">{r.emoji}</span>
            <span className="nb-q-tile-name">{r.name}</span>
            {matched[r.id] && <span className="nb-q-check">✓</span>}
          </button>
        ))}
      </div>
      {matchedCount === pairs.length && <p className="nb-q-feedback ok">¡Muy bien! Uniste todas 🎉</p>}
    </div>
  );
}

function PatternPicker({
  sequence,
  options,
  correctIndex,
  onResult
}: {
  sequence: ShapeSpec[];
  options: ShapeSpec[];
  correctIndex: number;
  onResult: (o: ActivityOutcome) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const attemptsRef = useRef(0);

  const solved = picked === correctIndex;

  const handlePick = (index: number) => {
    if (solved) return;
    attemptsRef.current += 1;
    setPicked(index);
    onResult({ correct: index === correctIndex, attempts: attemptsRef.current });
  };

  return (
    <div className="nb-q-pattern">
      <div className="nb-q-seq">
        {sequence.map((shape, i) => (
          <div key={i} className="nb-q-seq-item">
            <Shape3D kind={shape.kind} color={shape.color} />
          </div>
        ))}
        <div className="nb-q-seq-item nb-q-q">?</div>
      </div>
      <div className="nb-q-options">
        {options.map((shape, i) => {
          const state = picked === i ? (i === correctIndex ? 'ok' : 'wrong') : '';
          return (
            <button
              key={i}
              type="button"
              className={`nb-q-shape-option ${state}`}
              onClick={() => handlePick(i)}
              disabled={solved}
            >
              <Shape3D kind={shape.kind} color={shape.color} />
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`nb-q-feedback ${solved ? 'ok' : 'try'}`}>
          {solved ? '¡Correcto! 🎉' : 'Casi… probá otra vez 💪'}
        </p>
      )}
    </div>
  );
}

function CategoryPicker({ items, onResult }: { items: CatItem[]; onResult: (o: ActivityOutcome) => void }) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(false);
  const attemptsRef = useRef(0);

  const toggle = (index: number) => {
    if (done) return;
    setSelected((current) => ({ ...current, [index]: !current[index] }));
  };

  const check = () => {
    attemptsRef.current += 1;
    const allRight = items.every((item, i) => !!selected[i] === item.target);
    setCorrect(allRight);
    setDone(true);
    onResult({ correct: allRight, attempts: attemptsRef.current });
  };

  const retry = () => {
    setSelected({});
    setDone(false);
    setCorrect(false);
  };

  return (
    <div className="nb-q-category">
      <div className="nb-q-cat-grid">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            className={`nb-q-cat-item ${selected[i] ? 'sel' : ''} ${
              done ? (item.target ? 'reveal-target' : selected[i] ? 'reveal-wrong' : '') : ''
            }`}
            onClick={() => toggle(i)}
            disabled={done}
          >
            <span className="nb-q-tile-emoji">{item.emoji}</span>
            <span className="nb-q-tile-name">{item.label}</span>
          </button>
        ))}
      </div>
      {!done ? (
        <button type="button" className="nb-q-ready-btn" onClick={check}>
          Listo ✔
        </button>
      ) : (
        <div className="nb-q-cat-result">
          <p className={`nb-q-feedback ${correct ? 'ok' : 'try'}`}>
            {correct ? '¡Excelente! 🎉' : 'Buen intento 💪'}
          </p>
          <button type="button" className="nb-q-retry" onClick={retry}>
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

function PuzzlePicker({
  grid,
  options,
  correctIndex,
  onResult
}: {
  grid: (ShapeSpec | null)[];
  options: ShapeSpec[];
  correctIndex: number;
  onResult: (o: ActivityOutcome) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const attemptsRef = useRef(0);
  const solved = picked === correctIndex;

  const handlePick = (index: number) => {
    if (solved) return;
    attemptsRef.current += 1;
    setPicked(index);
    onResult({ correct: index === correctIndex, attempts: attemptsRef.current });
  };

  return (
    <div className="nb-q-puzzle">
      <div className="nb-q-grid">
        {grid.map((cell, i) => (
          <div key={i} className={`nb-q-cell ${cell ? '' : 'empty'}`}>
            {cell ? (
              <Shape3D kind={cell.kind} color={cell.color} size={52} />
            ) : picked !== null ? (
              <Shape3D kind={options[picked].kind} color={options[picked].color} size={52} />
            ) : (
              <span className="nb-q-qmark">?</span>
            )}
          </div>
        ))}
      </div>
      <div className="nb-q-options">
        {options.map((shape, i) => {
          const state = picked === i ? (i === correctIndex ? 'ok' : 'wrong') : '';
          return (
            <button
              key={i}
              type="button"
              className={`nb-q-shape-option ${state}`}
              onClick={() => handlePick(i)}
              disabled={solved}
            >
              <Shape3D kind={shape.kind} color={shape.color} />
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`nb-q-feedback ${solved ? 'ok' : 'try'}`}>
          {solved ? '¡Muy bien! 🎉' : 'Mmm… mirá de nuevo el cuadro 💪'}
        </p>
      )}
    </div>
  );
}

function EmotionPicker({
  face,
  options,
  correctIndex,
  onResult
}: {
  face: string;
  options: string[];
  correctIndex: number;
  onResult: (o: ActivityOutcome) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const attemptsRef = useRef(0);
  const solved = picked === correctIndex;

  const handlePick = (index: number) => {
    if (solved) return;
    attemptsRef.current += 1;
    setPicked(index);
    onResult({ correct: index === correctIndex, attempts: attemptsRef.current });
  };

  return (
    <div className="nb-q-emotion">
      <div className="nb-q-face">{face}</div>
      <div className="nb-q-options">
        {options.map((option, i) => {
          const state = picked === i ? (i === correctIndex ? 'ok' : 'wrong') : '';
          return (
            <button
              key={option}
              type="button"
              className={`nb-q-emo-option ${state}`}
              onClick={() => handlePick(i)}
              disabled={solved}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`nb-q-feedback ${solved ? 'ok' : 'try'}`}>
          {solved ? '¡Correcto! 🎉' : 'Volvé a mirar la carita 💗'}
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────

export default function Questionnaire({ userMetadata, onComplete }: QuestionnaireProps) {
  const age = userMetadata.childAge ?? 7;
  const steps = useMemo(() => buildSteps(age), [age]);

  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultAnswers);
  const [results, setResults] = useState<Record<string, ActivityOutcome>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const childName = userMetadata.childName ?? 'tu peque';
  const step = steps[currentStep];
  const progress =
    steps.length > 1 ? Math.round((currentStep / (steps.length - 1)) * 100) : 0;

  const isActivity = (s: Step): s is Extract<Step, { id: string; skills: QuestionnaireKey[] }> =>
    s.type === 'match' ||
    s.type === 'pattern' ||
    s.type === 'category' ||
    s.type === 'puzzle' ||
    s.type === 'emotion';

  const canAdvance = useMemo(() => {
    if (step.type === 'question') return answers[step.id] > 0;
    if (isActivity(step)) return results[step.id] !== undefined;
    return true;
  }, [step, answers, results]);

  const handleAnswer = (questionId: QuestionnaireKey, value: number) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleResult = (stepId: string, outcome: ActivityOutcome) => {
    setResults((current) => ({ ...current, [stepId]: outcome }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canAdvance) {
      setCurrentStep((value) => value + 1);
      setErrorMessage('');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((value) => value - 1);
      setErrorMessage('');
    }
  };

  const handleExit = async () => {
    // scope 'local' cierra la sesión en este dispositivo sin esperar al servidor
    // (evita que se cuelgue si Supabase está lento o en cold start). Al cerrar
    // sesión, App.tsx detecta el cambio y vuelve a la pantalla de bienvenida.
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((resolve) => window.setTimeout(resolve, 3000))
      ]);
    } catch (err) {
      console.error('Error al cerrar sesión', err);
    }
  };

  const buildProfileAndInsights = (): { profile: string; insights: QuestionnaireInsights } => {
    const boosts: QuestionnaireAnswers = { ...defaultAnswers };
    const activityResults: QuestionnaireActivityResult[] = [];
    const strengthsSet = new Set<string>();

    steps.forEach((s) => {
      if (isActivity(s)) {
        const outcome = results[s.id];
        if (!outcome) return;
        activityResults.push({
          id: s.id,
          label: s.label,
          skills: Array.from(new Set(s.skills)),
          correct: outcome.correct,
          attempts: outcome.attempts
        });
        if (outcome.correct) {
          s.skills.forEach((skill) => {
            boosts[skill] += 1;
          });
          strengthsSet.add(s.label);
        }
      }
    });

    const scores = enrichScores(answers, boosts);
    const profile = computeProfile(scores);

    // Áreas de apoyo: las 2 áreas que el papá/mamá reportó con mayor frecuencia
    const supportAreas = (Object.keys(answers) as QuestionnaireKey[])
      .map((key) => ({ key, value: answers[key] }))
      .sort((a, b) => b.value - a.value)
      .filter((entry) => entry.value >= 3)
      .slice(0, 2)
      .map((entry) => AREA_LABELS[entry.key]);

    const insights: QuestionnaireInsights = {
      areaScores: scores,
      strengths: Array.from(strengthsSet),
      supportAreas,
      activityResults,
      completedAt: new Date().toISOString()
    };

    return { profile, insights };
  };

  const handleSubmit = async () => {
    if (loading) return;
    setErrorMessage('');

    const allAnswered = steps.every((s) => {
      if (s.type === 'question') return answers[s.id] > 0;
      if (isActivity(s)) return results[s.id] !== undefined;
      return true;
    });

    if (!allAnswered) {
      setErrorMessage('Por favor completá todas las preguntas y actividades antes de continuar.');
      return;
    }

    setLoading(true);
    const { profile, insights } = buildProfileAndInsights();
    const updatedMetadata: UserMetadata = {
      ...userMetadata,
      questionnaireCompleted: true,
      questionnaireAnswers: answers,
      childProfile: profile,
      questionnaireInsights: insights
    };

    // Guardamos con límite de tiempo: si Supabase tarda (cold start),
    // igual avanzamos al dashboard (los datos se guardan en el servidor).
    let saveError: { message: string } | null = null;
    try {
      const updatePromise = supabase.auth.updateUser({ data: updatedMetadata });
      const timeoutPromise = new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), 10000)
      );
      const result = await Promise.race([updatePromise, timeoutPromise]);
      if (result && 'error' in result && result.error) {
        saveError = result.error;
      }
    } catch (err) {
      console.error('Error guardando el perfil', err);
    }

    setLoading(false);

    if (saveError) {
      setErrorMessage(saveError.message);
      return;
    }

    onComplete(updatedMetadata);
  };

  const answeredActivities = steps.filter((s) => isActivity(s) && results[s.id]).length;
  const totalActivities = steps.filter((s) => isActivity(s)).length;

  const headerTitle = step.type === 'question' || step.type === 'review' ? 'Valoración inicial' : 'Actividad';

  return (
    <main className="auth-shell questionnaire-shell">
      <style>{questionnaireStyles}</style>
      <div className="auth-card questionnaire-card">
        <div className="questionnaire-header">
          <div>
            <p className="section-label">{headerTitle}</p>
            <h2>Conozcamos a {childName}</h2>
            <p className="section-copy">
              Una guía de apoyo (no un diagnóstico) para personalizar la app según {childName}.
            </p>
          </div>
          <div className="nb-q-header-right">
            <div className="question-progress-pill">{progress}%</div>
            <button type="button" className="nb-q-exit" onClick={handleExit} disabled={loading}>
              🚪 Cerrar sesión
            </button>
          </div>
        </div>

        <div className="question-progress-track" aria-hidden="true">
          <div className="question-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="question-stage step-enter">
          <div className="step-card">
            {step.type === 'intro' && (
              <div className="nb-q-intro">
                <span className="nb-q-intro-emoji">🌟</span>
                <h3>¡Hola! Vamos a conocer a {childName}</h3>
                <p>
                  Este es un recorrido corto y divertido. Algunas preguntas las respondés tú (mamá o papá) y
                  otras son mini-juegos para hacer <strong>junto a tu peque</strong>: unir imágenes, seguir
                  patrones con figuras y reconocer emociones.
                </p>
                <p className="nb-q-intro-note">
                  Nos ayuda a personalizar las actividades. No mide si está bien o mal: acompañá con calma y sin
                  presión. 💙
                </p>
              </div>
            )}

            {step.type === 'question' && (
              <>
                <div className="question-badge">{step.section}</div>
                <div className="question-top">
                  <div className="question-icon">{step.icon}</div>
                  <div>
                    <h3>{step.prompt}</h3>
                    <p className="question-detail">{step.detail}</p>
                  </div>
                </div>
                <div className="nb-q-scale">
                  {answerOptions.map((option) => {
                    const selected = answers[step.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`nb-q-face-btn ${selected ? 'sel' : ''}`}
                        onClick={() => handleAnswer(step.id, option.value)}
                      >
                        <span className="nb-q-face-emoji">{option.face}</span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {isActivity(step) && (
              <>
                <div className="question-badge">{step.section}</div>
                <div className="question-top">
                  <div className="question-icon">{step.icon}</div>
                  <div>
                    <h3>{step.title}</h3>
                    <p className="question-detail">{step.prompt}</p>
                  </div>
                </div>
                <div className="nb-q-activity-body">
                  {step.type === 'match' && <MatchGame pairs={step.pairs} onResult={(o) => handleResult(step.id, o)} />}
                  {step.type === 'pattern' && (
                    <PatternPicker
                      sequence={step.sequence}
                      options={step.options}
                      correctIndex={step.correctIndex}
                      onResult={(o) => handleResult(step.id, o)}
                    />
                  )}
                  {step.type === 'category' && (
                    <CategoryPicker items={step.items} onResult={(o) => handleResult(step.id, o)} />
                  )}
                  {step.type === 'puzzle' && (
                    <PuzzlePicker
                      grid={step.grid}
                      options={step.options}
                      correctIndex={step.correctIndex}
                      onResult={(o) => handleResult(step.id, o)}
                    />
                  )}
                  {step.type === 'emotion' && (
                    <EmotionPicker
                      face={step.face}
                      options={step.options}
                      correctIndex={step.correctIndex}
                      onResult={(o) => handleResult(step.id, o)}
                    />
                  )}
                </div>
              </>
            )}

            {step.type === 'review' && (
              <div className="review-panel">
                <div className="question-top">
                  <div className="question-icon">🚀</div>
                  <div>
                    <h3>¡Casi listo!</h3>
                    <p className="question-detail">Revisá el resumen y creá el perfil de {childName}.</p>
                  </div>
                </div>
                <div className="nb-q-review-grid">
                  <div className="nb-q-review-card">
                    <strong>Actividades completadas</strong>
                    <p className="nb-q-big">
                      {answeredActivities}/{totalActivities}
                    </p>
                  </div>
                  <div className="nb-q-review-card">
                    <strong>Cuestionario</strong>
                    <p className="nb-q-big">
                      {(Object.keys(answers) as QuestionnaireKey[]).filter((k) => answers[k] > 0).length}/6
                    </p>
                  </div>
                </div>
                <p className="nb-q-review-note">
                  Al finalizar guardamos todo de forma segura y personalizamos el panel de {childName}. Recordá:
                  esto es apoyo educativo, no un diagnóstico clínico.
                </p>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <div className="quiz-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 || loading}
          >
            ← Anterior
          </button>
          {step.type === 'review' ? (
            <button className="primary-button" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creando perfil...' : 'Finalizar y guardar'}
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={handleNext}
              disabled={!canAdvance || loading}
            >
              Siguiente
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <p>Guardando el perfil y preparando el panel...</p>
          </div>
        </div>
      )}
    </main>
  );
}

// ───────────────────────────────────────────────────────────
// Estilos propios de las actividades (autocontenidos, prefijo nb-q-)
// ───────────────────────────────────────────────────────────

const questionnaireStyles = `
.nb-q-header-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.nb-q-exit{display:inline-flex;align-items:center;gap:6px;background:#fff;border:2px solid #fecaca;color:#dc2626;font-size:13px;font-weight:700;cursor:pointer;padding:7px 14px;border-radius:999px;transition:transform .12s ease,border-color .12s ease,background .12s ease,box-shadow .12s ease}
.nb-q-exit:hover{transform:translateY(-1px);background:#fef2f2;border-color:#f87171;box-shadow:0 4px 12px rgba(220,38,38,.15)}
.nb-q-exit:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}
.nb-q-intro{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:6px 4px}
.nb-q-intro-emoji{font-size:52px}
.nb-q-intro h3{margin:0}
.nb-q-intro p{margin:0;color:#475569;line-height:1.5}
.nb-q-intro-note{background:#f5f3ff;border:1px solid #ede9fe;border-radius:14px;padding:10px 14px;color:#5b21b6!important}

.nb-q-scale{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-top:16px}
.nb-q-face-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:16px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:transform .12s ease,border-color .12s ease,background .12s ease;font-size:13px;color:#334155;font-weight:600}
.nb-q-face-emoji{font-size:28px}
.nb-q-face-btn:hover{transform:translateY(-2px);border-color:#c4b5fd}
.nb-q-face-btn.sel{border-color:#7c3aed;background:#f5f3ff;box-shadow:0 6px 16px rgba(124,58,237,.18)}

.nb-q-activity-body{margin-top:14px}

.nb-q-match{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.nb-q-match-col{display:flex;flex-direction:column;gap:10px}
.nb-q-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:16px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:transform .12s ease,border-color .12s ease,background .12s ease}
.nb-q-tile-emoji{font-size:34px;line-height:1}
.nb-q-tile-name{font-size:12px;color:#64748b;font-weight:600}
.nb-q-tile:hover{transform:translateY(-2px);border-color:#c4b5fd}
.nb-q-tile.sel{border-color:#7c3aed;background:#f5f3ff}
.nb-q-tile.ok{border-color:#22c55e;background:#f0fdf4;cursor:default}
.nb-q-tile.wrong{animation:nbShake .4s ease}
.nb-q-check{position:absolute;top:6px;right:8px;color:#16a34a;font-weight:800}

.nb-q-pattern{display:flex;flex-direction:column;gap:16px;align-items:center}
.nb-q-seq{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;background:#f8fafc;border-radius:18px;padding:12px}
.nb-q-seq-item{width:58px;height:58px;display:flex;align-items:center;justify-content:center}
.nb-q-q,.nb-q-qmark{font-size:30px;font-weight:800;color:#94a3b8;border:2px dashed #cbd5e1;border-radius:12px}
.nb-q-q{width:54px;height:54px;display:flex;align-items:center;justify-content:center}

.nb-q-options{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.nb-q-shape-option{padding:10px;border-radius:16px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:transform .12s ease,border-color .12s ease}
.nb-q-shape-option:hover{transform:translateY(-2px);border-color:#c4b5fd}
.nb-q-shape-option.ok{border-color:#22c55e;background:#f0fdf4}
.nb-q-shape-option.wrong{border-color:#ef4444;background:#fef2f2;animation:nbShake .4s ease}

.nb-q-category{display:flex;flex-direction:column;gap:14px;align-items:center}
.nb-q-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:10px;width:100%}
.nb-q-cat-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 6px;border-radius:16px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:transform .12s ease,border-color .12s ease,background .12s ease}
.nb-q-cat-item:hover{transform:translateY(-2px);border-color:#c4b5fd}
.nb-q-cat-item.sel{border-color:#7c3aed;background:#f5f3ff}
.nb-q-cat-item.reveal-target{border-color:#22c55e;background:#f0fdf4}
.nb-q-cat-item.reveal-wrong{border-color:#ef4444;background:#fef2f2}
.nb-q-ready-btn{padding:10px 22px;border-radius:999px;border:none;background:#7c3aed;color:#fff;font-weight:700;cursor:pointer}
.nb-q-ready-btn:hover{background:#6d28d9}
.nb-q-cat-result{display:flex;flex-direction:column;gap:8px;align-items:center}
.nb-q-retry{background:none;border:none;color:#7c3aed;font-weight:700;cursor:pointer;text-decoration:underline}

.nb-q-puzzle{display:flex;flex-direction:column;gap:16px;align-items:center}
.nb-q-grid{display:grid;grid-template-columns:repeat(2,64px);grid-template-rows:repeat(2,64px);gap:8px;background:#f8fafc;padding:12px;border-radius:18px}
.nb-q-cell{display:flex;align-items:center;justify-content:center;background:#fff;border-radius:12px;border:2px solid #eef2f7}
.nb-q-cell.empty{border:2px dashed #cbd5e1}

.nb-q-emotion{display:flex;flex-direction:column;gap:16px;align-items:center}
.nb-q-emotion .nb-q-face{font-size:72px;line-height:1}
.nb-q-emo-option{padding:10px 20px;border-radius:999px;border:2px solid #e5e7eb;background:#fff;font-weight:700;color:#334155;cursor:pointer;transition:transform .12s ease,border-color .12s ease}
.nb-q-emo-option:hover{transform:translateY(-2px);border-color:#c4b5fd}
.nb-q-emo-option.ok{border-color:#22c55e;background:#f0fdf4}
.nb-q-emo-option.wrong{border-color:#ef4444;background:#fef2f2;animation:nbShake .4s ease}

.nb-q-feedback{margin:0;font-weight:700;text-align:center}
.nb-q-feedback.ok{color:#16a34a}
.nb-q-feedback.try{color:#d97706}

.nb-q-review-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.nb-q-review-card{background:#f8fafc;border-radius:16px;padding:14px;text-align:center}
.nb-q-review-card strong{color:#475569;font-size:13px}
.nb-q-big{font-size:26px;font-weight:800;color:#7c3aed;margin:6px 0 0}
.nb-q-review-note{margin-top:12px;color:#64748b;font-size:13px;line-height:1.5}

@keyframes nbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
`;
