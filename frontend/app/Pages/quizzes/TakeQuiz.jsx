import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import '../flashcards/Flashcards.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TakeQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetchQuizData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (quizStarted && quiz?.time_limit && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [quizStarted, quiz?.time_limit]);

  const fetchQuizData = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`*, flashcard_sets (title, description)`)
        .eq('id', id)
        .single();
      if (quizError) throw quizError;
      setQuiz(quizData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index');
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      const optionsMap = {};
      questionsData?.forEach(question => {
        if (question.question_type === 'multiple_choice') {
          const allOptions = [...question.wrong_answers, question.correct_answer];
          optionsMap[question.id] = allOptions.sort(() => Math.random() - 0.5);
        }
      });
      setShuffledOptions(optionsMap);

      if (quizData.time_limit) setTimeLeft(quizData.time_limit * 60);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({ quiz_id: id, user_id: user.id, total_questions: questions.length, answers: {} })
        .select()
        .single();
      if (attemptError) throw attemptError;

      setAttemptId(attempt.id);
      setQuizStarted(true);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let score = 0;
      questions.forEach(q => { if (answers[q.id] === q.correct_answer) score += q.points; });
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : null;

      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({ score, percentage: percentage.toFixed(2), time_taken: timeTaken, answers, completed_at: new Date().toISOString(), is_completed: true })
        .eq('id', attemptId);
      if (updateError) throw updateError;

      navigate(`/quizzes/${id}/results/${attemptId}`);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <div className="feed-loading">
            <div className="loading-spinner" />
            <span>Loading quiz...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <div className="feed-empty">
            <p>Quiz not found or has no questions.</p>
            <Link to="/flashcards" className="fc-back-link">Back to Flashcard Sets</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── PRE-START SCREEN ─── */
  if (!quizStarted) {
    const quizTypeLabel = quiz.quiz_type === 'multiple_choice' ? 'Multiple Choice'
      : quiz.quiz_type === 'true_false' ? 'True / False'
      : 'Fill in the Blank';

    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <Link to={`/flashcards/${quiz.flashcard_set_id}`} className="fc-back-link">
            ← Back to Flashcard Set
          </Link>

          <div className="quiz-intro-card">
            <div className="quiz-intro-badge">{quizTypeLabel}</div>
            <h1 className="quiz-intro-title">{quiz.title}</h1>
            {quiz.flashcard_sets && (
              <p className="quiz-intro-source">
                Generated from <strong>{quiz.flashcard_sets.title}</strong>
              </p>
            )}
            {quiz.description && (
              <p className="quiz-intro-desc">{quiz.description}</p>
            )}

            <div className="quiz-intro-stats">
              <div className="quiz-intro-stat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <span className="quiz-intro-stat-value">{questions.length}</span>
                  <span className="quiz-intro-stat-label">Questions</span>
                </div>
              </div>
              {quiz.time_limit && (
                <div className="quiz-intro-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <span className="quiz-intro-stat-value">{quiz.time_limit} min</span>
                    <span className="quiz-intro-stat-label">Time Limit</span>
                  </div>
                </div>
              )}
              {!quiz.time_limit && (
                <div className="quiz-intro-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <span className="quiz-intro-stat-value">Untimed</span>
                    <span className="quiz-intro-stat-label">No Limit</span>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="quiz-start-btn" onClick={startQuiz}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── QUIZ IN PROGRESS ─── */
  return (
    <div className="quiz-immersive">
      {/* Progress bar */}
      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Top bar */}
      <div className="study-top-bar">
        <button className="study-exit-btn" onClick={() => navigate(`/flashcards/${quiz.flashcard_set_id}`)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="quiz-top-info">
          {timeLeft !== null && (
            <span className={`quiz-timer ${timeLeft < 60 ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          )}
          <span className="study-counter">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {error && <div className="form-error" style={{ margin: '0 var(--space-6)' }}>{error}</div>}

      {/* Question area */}
      <div className="quiz-question-area">
        <div className="quiz-question-number">Question {currentQuestionIndex + 1}</div>
        <div className="quiz-question-card">
          <p className="quiz-question-text">{currentQuestion.question_text}</p>
        </div>

        {/* Multiple choice with A, B, C, D */}
        {currentQuestion.question_type === 'multiple_choice' && (
          <div className="quiz-options">
            {shuffledOptions[currentQuestion.id]?.map((option, index) => (
              <button
                key={index}
                className={`quiz-option ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                onClick={() => handleAnswerChange(currentQuestion.id, option)}
              >
                <span className="quiz-option-letter">{LETTERS[index]}</span>
                <span className="quiz-option-text">{option}</span>
              </button>
            ))}
          </div>
        )}

        {/* True / False */}
        {currentQuestion.question_type === 'true_false' && (
          <div className="quiz-options quiz-options-tf">
            <button
              className={`quiz-option ${answers[currentQuestion.id] === 'True' ? 'selected' : ''}`}
              onClick={() => handleAnswerChange(currentQuestion.id, 'True')}
            >
              <span className="quiz-option-letter">T</span>
              <span className="quiz-option-text">True</span>
            </button>
            <button
              className={`quiz-option ${answers[currentQuestion.id] === 'False' ? 'selected' : ''}`}
              onClick={() => handleAnswerChange(currentQuestion.id, 'False')}
            >
              <span className="quiz-option-letter">F</span>
              <span className="quiz-option-text">False</span>
            </button>
          </div>
        )}

        {/* Fill in the blank */}
        {currentQuestion.question_type === 'fill_blank' && (
          <input
            type="text"
            placeholder="Type your answer..."
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            className="quiz-fill-input"
            autoFocus
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="quiz-bottom-controls">
        <button className="study-nav-btn" onClick={goToPrev} disabled={currentQuestionIndex === 0}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Question dots */}
        <div className="quiz-dots">
          {questions.map((q, i) => (
            <button
              key={q.id}
              className={`quiz-dot ${i === currentQuestionIndex ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
              onClick={() => setCurrentQuestionIndex(i)}
            />
          ))}
        </div>

        <button className="study-nav-btn" onClick={goToNext} disabled={isLastQuestion}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Submit bar */}
      {answeredCount === questions.length && (
        <div className="quiz-submit-bar">
          <span className="quiz-submit-count">{answeredCount}/{questions.length} answered</span>
          <button className="quiz-submit-btn" onClick={handleSubmitQuiz} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      )}
      {answeredCount > 0 && answeredCount < questions.length && (
        <div className="quiz-submit-bar">
          <span className="quiz-submit-count">{answeredCount}/{questions.length} answered</span>
          <button className="quiz-submit-btn outline" onClick={handleSubmitQuiz} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Early'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TakeQuiz;
