import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import '../flashcards/Flashcards.css';

const QuizResults = () => {
  const { quizId, attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchResults(); }, [quizId, attemptId]);

  const fetchResults = async () => {
    try {
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts').select('*').eq('id', attemptId).single();
      if (attemptError) throw attemptError;
      setAttempt(attemptData);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes').select(`*, flashcard_sets (title, description)`).eq('id', quizId).single();
      if (quizError) throw quizError;
      setQuiz(quizData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index');
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (pct) => {
    if (pct >= 90) return 'var(--accent)';
    if (pct >= 70) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getGradeMessage = (pct) => {
    if (pct >= 90) return 'Excellent work!';
    if (pct >= 80) return 'Great job!';
    if (pct >= 70) return 'Good effort!';
    if (pct >= 60) return 'Keep practicing!';
    return 'Study more and try again!';
  };

  if (loading) {
    return (
      <div className="fc-page"><div className="fc-form-container">
        <div className="feed-loading"><div className="loading-spinner" /><span>Loading results...</span></div>
      </div></div>
    );
  }

  if (error || !attempt || !quiz) {
    return (
      <div className="fc-page"><div className="fc-form-container">
        <div className="feed-empty"><p>Could not load quiz results.</p>
        <Link to="/flashcards" className="fc-back-link">Back to Flashcard Sets</Link></div>
      </div></div>
    );
  }

  const userAnswers = attempt.answers || {};
  const correctCount = questions.filter(q => userAnswers[q.id] === q.correct_answer).length;
  const incorrectCount = questions.length - correctCount;
  const pct = Math.round(attempt.percentage);

  return (
    <div className="fc-page">
      <div className="fc-form-container">
        <Link to={`/flashcards/${quiz.flashcard_set_id}`} className="fc-back-link">← Back to Flashcard Set</Link>

        {/* Score hero */}
        <div className="quiz-results-card">
          <div className="quiz-results-ring" style={{ '--pct': pct, '--ring-color': getScoreColor(pct) }}>
            <svg viewBox="0 0 120 120" className="quiz-results-ring-svg">
              <circle cx="60" cy="60" r="52" className="quiz-ring-bg" />
              <circle cx="60" cy="60" r="52" className="quiz-ring-fill" />
            </svg>
            <span className="quiz-results-pct">{pct}%</span>
          </div>
          <p className="quiz-results-grade">{getGradeMessage(pct)}</p>

          <div className="quiz-results-stats">
            <div className="quiz-stat">
              <span className="quiz-stat-value correct-stat">{correctCount}</span>
              <span className="quiz-stat-label">Correct</span>
            </div>
            <div className="quiz-stat-divider" />
            <div className="quiz-stat">
              <span className="quiz-stat-value incorrect-stat">{incorrectCount}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </div>
            <div className="quiz-stat-divider" />
            <div className="quiz-stat">
              <span className="quiz-stat-value">{formatTime(attempt.time_taken)}</span>
              <span className="quiz-stat-label">Time</span>
            </div>
          </div>

          <div className="quiz-results-actions">
            <Link to={`/quizzes/${quizId}`} className="form-submit-btn">Retake Quiz</Link>
            <Link to={`/flashcards/${quiz.flashcard_set_id}`} className="form-cancel-btn">Back to Flashcards</Link>
          </div>
        </div>

        {/* Question review */}
        <div className="quiz-review">
          <h3 className="quiz-review-title">Question Review</h3>
          {questions.map((question, index) => {
            const userAnswer = userAnswers[question.id];
            const isCorrect = userAnswer === question.correct_answer;

            return (
              <div key={question.id} className={`quiz-review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="quiz-review-header">
                  <span className={`quiz-review-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <p className="quiz-review-question">Q{index + 1}. {question.question_text}</p>
                </div>
                <p className="quiz-review-answer">
                  Your answer: <strong>{userAnswer || 'No answer'}</strong>
                </p>
                {!isCorrect && (
                  <p className="quiz-review-correct">
                    Correct answer: <strong>{question.correct_answer}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
