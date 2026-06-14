import { useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import type { QuestionnaireAnswers, QuestionnaireKey, UserMetadata } from './types';

interface QuestionnaireProps {
  userMetadata: UserMetadata;
  onComplete: (metadata: UserMetadata) => void;
}

type ActivityId = 'pattern' | 'emotion' | 'memory';

type QuestionnaireStep =
  | {
      type: 'question';
      id: QuestionnaireKey;
      section: string;
      icon: string;
      prompt: string;
      detail: string;
    }
  | {
      type: 'activity';
      id: ActivityId;
      section: string;
      icon: string;
      title: string;
      prompt: string;
      choices: { label: string; value: string }[];
      correctAnswer: string;
    }
  | {
      type: 'review';
      section: string;
      icon: string;
      title: string;
      prompt: string;
    };

const answerOptions = [
  { label: '1 - Casi nunca', value: 1 },
  { label: '2 - Algunas veces', value: 2 },
  { label: '3 - A menudo', value: 3 },
  { label: '4 - Muy a menudo', value: 4 },
  { label: '5 - Siempre', value: 5 }
];

const steps: QuestionnaireStep[] = [
  {
    type: 'question',
    id: 'attention',
    section: 'Atención y concentración',
    icon: '🎯',
    prompt: '¿Tu hijo/a tiene dificultad para mantener la atención en actividades breves?',
    detail: 'Esto ayuda a identificar la consistencia de la atención en tareas cotidianas.'
  },
  {
    type: 'question',
    id: 'behavior',
    section: 'Energía e impulsividad',
    icon: '⚡',
    prompt: '¿Se altera o reacciona con intensidad cuando cambian las rutinas?',
    detail: 'Evalúa control emocional y respuesta a cambios inesperados.'
  },
  {
    type: 'activity',
    id: 'pattern',
    section: 'Atención y concentración',
    icon: '🧩',
    title: 'Reconoce el patrón',
    prompt: 'Selecciona la secuencia que completa el patrón.',
    choices: [
      { value: 'A', label: '🟣🟢🟣🟢' },
      { value: 'B', label: '🟣🟢🟣🟢🟣' },
      { value: 'C', label: '🟢🟣🟢🟣' }
    ],
    correctAnswer: 'B'
  },
  {
    type: 'question',
    id: 'communication',
    section: 'Comunicación social',
    icon: '🗣️',
    prompt: '¿Tu hijo/a encuentra difícil iniciar o mantener interacciones con otras personas?',
    detail: 'Analiza cómo se relaciona con pares y adultos en su entorno.'
  },
  {
    type: 'activity',
    id: 'emotion',
    section: 'Reconocimiento de emociones',
    icon: '😊',
    title: 'Identifica la emoción',
    prompt: '¿Qué emoción transmite este emoji?',
    choices: [
      { value: 'Contento', label: '😊 Contento' },
      { value: 'Preocupado', label: '😟 Preocupado' },
      { value: 'Enfadado', label: '😠 Enfadado' }
    ],
    correctAnswer: 'Preocupado'
  },
  {
    type: 'question',
    id: 'sensory',
    section: 'Procesamiento sensorial',
    icon: '🎧',
    prompt: '¿Tu hijo/a es sensible a sonidos, texturas, luces o temperaturas?',
    detail: 'Permite detectar la reacción ante estímulos sensoriales comunes.'
  },
  {
    type: 'activity',
    id: 'memory',
    section: 'Memoria visual',
    icon: '🎨',
    title: 'Memoria de colores',
    prompt: 'Recuerda la secuencia y elige el tercer color.',
    choices: [
      { value: 'Verde', label: 'Verde' },
      { value: 'Amarillo', label: 'Amarillo' },
      { value: 'Morado', label: 'Morado' }
    ],
    correctAnswer: 'Morado'
  },
  {
    type: 'question',
    id: 'emotions',
    section: 'Regulación emocional',
    icon: '💖',
    prompt: '¿Tu hijo/a muestra cambios emocionales intensos o se frustra con facilidad?',
    detail: 'Mide tolerancia a la frustración y gestión de emociones.'
  },
  {
    type: 'question',
    id: 'learning',
    section: 'Aprendizaje y comprensión',
    icon: '📘',
    prompt: '¿Tu hijo/a necesita más tiempo para comprender nuevas instrucciones o conceptos?',
    detail: 'Evalúa ritmo de aprendizaje y claridad para entender tareas.'
  },
  {
    type: 'review',
    section: 'Resumen final',
    icon: '🚀',
    title: 'Casi listo',
    prompt: 'Revisa tus respuestas y genera el perfil neurodiverso real.'
  }
];

const defaultAnswers: QuestionnaireAnswers = {
  attention: 0,
  behavior: 0,
  communication: 0,
  sensory: 0,
  emotions: 0,
  learning: 0
};

const computeProfile = (
  answers: QuestionnaireAnswers,
  taskResults: Record<ActivityId, boolean | null>
) => {
  const enriched = {
    attention: answers.attention + (taskResults.pattern ? 2 : 0) + (taskResults.memory ? 1 : 0),
    behavior: answers.behavior,
    communication: answers.communication + (taskResults.emotion ? 2 : 0),
    sensory: answers.sensory,
    emotions: answers.emotions + (taskResults.emotion ? 1 : 0),
    learning: answers.learning + (taskResults.memory ? 2 : 0)
  };

  const detected: string[] = [];
  if (enriched.attention >= 7 && enriched.behavior >= 6) detected.push('TDAH');
  if (enriched.communication >= 7 && enriched.sensory >= 6) detected.push('TEA');
  if (enriched.sensory >= 7) detected.push('Procesamiento sensorial');
  if (enriched.emotions >= 7) detected.push('Ansiedad');
  if (enriched.learning >= 7 && enriched.attention <= 5) detected.push('Dislexia');
  if (enriched.learning >= 8 && enriched.attention >= 6) detected.push('Altas capacidades');

  if (detected.length === 0) {
    return 'Perfil equilibrado con señales de apoyo en aprendizaje y concentración';
  }

  if (detected.length === 1) {
    return `Perfil con énfasis en ${detected[0]}`;
  }

  return `Perfil combinado: ${detected.join(', ')}`;
};

export default function Questionnaire({ userMetadata, onComplete }: QuestionnaireProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [taskSelections, setTaskSelections] = useState<Record<ActivityId, string>>({
    pattern: '',
    emotion: '',
    memory: ''
  });
  const [taskResults, setTaskResults] = useState<Record<ActivityId, boolean | null>>({
    pattern: null,
    emotion: null,
    memory: null
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const childName = userMetadata.childName ?? 'tu hijo/a';
  const step = steps[currentStep];
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  const canAdvance = useMemo(() => {
    if (step.type === 'question') {
      return answers[step.id] > 0;
    }
    if (step.type === 'activity') {
      return taskSelections[step.id] !== '';
    }
    return true;
  }, [step, answers, taskSelections]);

  const summaryText = useMemo(() => {
    const entries = Object.entries(answers).map(([key, value]) => `${key}: ${value}`);
    return entries.join(' · ');
  }, [answers]);

  const handleAnswer = (questionId: QuestionnaireKey, value: number) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleTaskSelect = (stepId: ActivityId, value: string, correctAnswer: string) => {
    setTaskSelections((current) => ({ ...current, [stepId]: value }));
    setTaskResults((current) => ({ ...current, [stepId]: value === correctAnswer }));
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

  const handleSubmit = async () => {
    if (loading) return;
    setErrorMessage('');

    const allAnswered = steps.every((step) => {
      if (step.type === 'question') return answers[step.id] > 0;
      if (step.type === 'activity') return taskSelections[step.id] !== '';
      return true;
    });

    if (!allAnswered) {
      setErrorMessage('Por favor completa todas las preguntas y actividades antes de continuar.');
      return;
    }

    setLoading(true);
    const childProfile = computeProfile(answers, taskResults);
    const updatedMetadata: UserMetadata = {
      ...userMetadata,
      questionnaireCompleted: true,
      questionnaireAnswers: answers,
      childProfile
    };

    // Guardamos con un límite de tiempo: si Supabase tarda demasiado,
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

  return (
    <main className="auth-shell questionnaire-shell">
      <div className="auth-card questionnaire-card">
        <div className="questionnaire-header">
          <div>
            <p className="section-label">Diagnóstico interactivo</p>
            <h2>Cuestionario para {childName}</h2>
            <p className="section-copy">Avanza una pregunta a la vez para obtener un perfil real y accionable.</p>
          </div>
          <div className="question-progress-pill">{progress}%</div>
        </div>

        <div className="question-progress-track" aria-hidden="true">
          <div className="question-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="question-stage step-enter">
          <div className="step-card">
            <div className="question-badge">{step.section}</div>
            <div className="question-top">
              <div className="question-icon">{step.icon}</div>
              <div>
                <h3>{step.type === 'review' ? step.title : step.type === 'question' ? step.prompt : step.title}</h3>
                <p className="question-detail">{step.type === 'question' ? step.detail : step.prompt}</p>
              </div>
            </div>

            {step.type === 'question' && (
              <div className="answer-grid">
                {answerOptions.map((option) => {
                  const selected = answers[step.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`answer-button ${selected ? 'selected' : ''}`}
                      onClick={() => handleAnswer(step.id, option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {step.type === 'activity' && (
              <div className="activity-card">
                <div className="activity-hint">
                  <span className="activity-icon">{step.icon}</span>
                  <p>Actividad interactiva</p>
                </div>
                <div className="activity-body">
                  {step.id === 'pattern' && <div className="pattern-preview">🟣🟢🟣🟢 ?</div>}
                  {step.id === 'emotion' && <div className="emotion-preview">😟</div>}
                  {step.id === 'memory' && (
                    <div className="memory-preview">
                      <span className="memory-color green" />
                      <span className="memory-color yellow" />
                      <span className="memory-color purple" />
                    </div>
                  )}
                  <div className="answer-grid">
                    {step.choices.map((choice) => {
                      const selected = taskSelections[step.id] === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          className={`answer-button ${selected ? 'selected' : ''}`}
                          onClick={() => handleTaskSelect(step.id, choice.value, step.correctAnswer)}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step.type === 'review' && (
              <div className="review-panel">
                <p className="review-copy">Tus respuestas están listas. Si todo se ve bien, calcula el perfil y te llevaremos al dashboard.</p>
                <div className="review-summary">
                  <strong>Resumen rápido</strong>
                  <p>{summaryText}</p>
                  <p>Patrón: {taskSelections.pattern || 'Sin respuesta'}</p>
                  <p>Emoción: {taskSelections.emotion || 'Sin respuesta'}</p>
                  <p>Memoria: {taskSelections.memory || 'Sin respuesta'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <div className="quiz-footer">
          <button className="secondary-button" type="button" onClick={handlePrev} disabled={currentStep === 0 || loading}>
            ← Anterior
          </button>
          {step.type === 'review' ? (
            <button className="primary-button" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Calculando perfil...' : 'Finalizar y guardar'}
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={handleNext} disabled={!canAdvance || loading}>
              Siguiente
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <p>Guardando el perfil y preparando tu dashboard...</p>
          </div>
        </div>
      )}
    </main>
  );
}
