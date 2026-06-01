import { useState, type FormEvent } from 'react';
import { supabase } from './lib/supabase';
import type { QuestionnaireAnswers, UserMetadata } from './types';

interface QuestionnaireProps {
  userMetadata: UserMetadata;
  onComplete: (metadata: UserMetadata) => void;
}

const questions = [
  {
    id: 'attention' as const,
    label: 'Atención',
    prompt: '¿Tu hijo/a tiene dificultad para mantener la atención en actividades breves?'
  },
  {
    id: 'behavior' as const,
    label: 'Comportamiento',
    prompt: '¿Tu hijo/a se altera o reacciona con intensidad cuando cambian las rutinas?'
  },
  {
    id: 'communication' as const,
    label: 'Comunicación social',
    prompt: '¿Tu hijo/a encuentra difícil iniciar o mantener interacciones con otras personas?'
  },
  {
    id: 'sensory' as const,
    label: 'Procesamiento sensorial',
    prompt: '¿Tu hijo/a es sensible a sonidos, texturas, luces o temperaturas?'
  },
  {
    id: 'emotions' as const,
    label: 'Emociones',
    prompt: '¿Tu hijo/a muestra cambios emocionales intensos o se frustra con facilidad?'
  },
  {
    id: 'learning' as const,
    label: 'Aprendizaje',
    prompt: '¿Tu hijo/a necesita más tiempo para comprender nuevas instrucciones o conceptos?'
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

const computeProfile = (answers: QuestionnaireAnswers) => {
  const values = Object.entries(answers) as [keyof QuestionnaireAnswers, number][];
  const maxScore = Math.max(...values.map(([, score]) => score));
  const topCategories = values
    .filter(([, score]) => score === maxScore)
    .map(([key]) => questions.find((question) => question.id === key)?.label ?? key);

  if (topCategories.length === 1) {
    return `Perfil con énfasis en ${topCategories[0]}`;
  }

  if (topCategories.length === 2) {
    return `Perfil combinado de ${topCategories[0]} y ${topCategories[1]}`;
  }

  return `Perfil equilibrado con atención en ${topCategories.slice(0, 3).join(', ')}`;
};

export default function Questionnaire({ userMetadata, onComplete }: QuestionnaireProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultAnswers);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const childName = userMetadata.childName ?? 'tu hijo/a';

  const handleChange = (questionId: keyof QuestionnaireAnswers, value: number) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const allAnswered = questions.every((question) => answers[question.id] > 0);
    if (!allAnswered) {
      setErrorMessage('Responde todas las preguntas para continuar.');
      return;
    }

    setLoading(true);
    const childProfile = computeProfile(answers);
    const updatedMetadata: UserMetadata = {
      ...userMetadata,
      questionnaireCompleted: true,
      questionnaireAnswers: answers,
      childProfile
    };

    const { error } = await supabase.auth.updateUser({
      data: updatedMetadata
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onComplete(updatedMetadata);
  };

  return (
    <main className="auth-shell questionnaire-shell">
      <div className="auth-card questionnaire-card">
        <div className="auth-header">
          <h2>Cuestionario diagnóstico</h2>
          <p>Responde sobre {childName} para generar un perfil real y activar el dashboard.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {questions.map((question) => (
            <label key={question.id}>
              {question.label}
              <p className="question-prompt">{question.prompt}</p>
              <select
                value={answers[question.id]}
                onChange={(event) => handleChange(question.id, Number(event.target.value))}
                required
              >
                <option value={0}>Selecciona</option>
                <option value={1}>1 - Casi nunca</option>
                <option value={2}>2 - Algunas veces</option>
                <option value={3}>3 - A menudo</option>
                <option value={4}>4 - Muy a menudo</option>
                <option value={5}>5 - Siempre</option>
              </select>
            </label>
          ))}

          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Finalizar diagnóstico'}
          </button>
        </form>
      </div>
    </main>
  );
}
