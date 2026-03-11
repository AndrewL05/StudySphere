import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import '../flashcards/Flashcards.css';

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [quizStarted, quiz?.time_limit]);

  const fetchQuizData = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          flashcard_sets (title, description)
        `)
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

      // Pre-shuffle options for multiple choice questions
      const optionsMap = {};
      questionsData?.forEach(question => {
        if (question.question_type === 'multiple_choice') {
          const allOptions = [...question.wrong_answers, question.correct_answer];
          optionsMap[question.id] = allOptions.sort(() => Math.random() - 0.5);
        }
      });
      setShuffledOptions(optionsMap);

      // Set time limit if exists
      if (quizData.time_limit) {
        setTimeLeft(quizData.time_limit * 60); // Convert minutes to seconds
      }
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

      // Create quiz attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: id,
          user_id: user.id,
          total_questions: questions.length,
          answers: {}
        })
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
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    const question = questions.find(q => q.id === questionId);
    if (question && (question.question_type === 'multiple_choice' || question.question_type === 'true_false')) {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate score
      let score = 0;
      questions.forEach(question => {
        const userAnswer = answers[question.id];
        if (userAnswer === question.correct_answer) {
          score += question.points;
        }
      });

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : null;

      // Update quiz attempt
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score,
          percentage: percentage.toFixed(2),
          time_taken: timeTaken,
          answers,
          completed_at: new Date().toISOString(),
          is_completed: true
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // Navigate to results
      navigate(`/quizzes/${id}/results/${attemptId}`);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="study-container">
        <div className="loading-spinner">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="study-container">
        <div className="empty-study">
          <h2>Quiz not found</h2>
          <p>This quiz doesn't exist or has no questions.</p>
          <Link to="/flashcards" className="back-to-set-btn">
            Back to Flashcard Sets
          </Link>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="study-container">
        <div className="quiz-intro">
          <div className="study-complete">
            <h2>{quiz.title}</h2>
            {quiz.description && <p>{quiz.description}</p>}
            
            <div className="quiz-info">
              <div className="final-stats">
                <div className="stat-item">
                  <span className="stat-number">{questions.length}</span>
                  <span className="stat-label">Questions</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{quiz.quiz_type.replace('_', ' ')}</span>
                  <span className="stat-label">Type</span>
                </div>
                {quiz.time_limit && (
                  <div className="stat-item">
                    <span className="stat-number">{quiz.time_limit}</span>
                    <span className="stat-label">Minutes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="study-actions">
              <button className="study-again-btn" onClick={startQuiz}>
                Start Quiz
              </button>
              <Link to={`/flashcards/${quiz.flashcard_set_id}`} className="back-to-set-btn">
                Back to Flashcard Set
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {timeLeft !== null && <span className="quiz-timer">{formatTime(timeLeft)}</span>}
          <span className="study-counter">{currentQuestionIndex + 1} / {questions.length}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Question area */}
      <div className="quiz-question-area">
        <div className="quiz-question-card">
          <p className="quiz-question-text">{currentQuestion.question_text}</p>
        </div>

        {/* Answer options */}
        {currentQuestion.question_type === 'multiple_choice' && (
          <div className="quiz-options">
            {shuffledOptions[currentQuestion.id]?.map((option, index) => (
              <button
                key={index}
                className={`quiz-option ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                onClick={() => handleAnswerChange(currentQuestion.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.question_type === 'true_false' && (
          <div className="quiz-options">
            <button
              className={`quiz-option ${answers[currentQuestion.id] === 'True' ? 'selected' : ''}`}
              onClick={() => handleAnswerChange(currentQuestion.id, 'True')}
            >
              True
            </button>
            <button
              className={`quiz-option ${answers[currentQuestion.id] === 'False' ? 'selected' : ''}`}
              onClick={() => handleAnswerChange(currentQuestion.id, 'False')}
            >
              False
            </button>
          </div>
        )}

        {currentQuestion.question_type === 'fill_blank' && (
          <input
            type="text"
            placeholder="Enter your answer"
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            className="quiz-fill-input"
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="quiz-bottom-controls">
        <button
          className="study-nav-btn"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {isLastQuestion ? (
          <button
            className="form-submit-btn"
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            className="form-submit-btn"
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
          >
            Next Question
          </button>
        )}

        <button
          className="study-nav-btn"
          onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
          disabled={isLastQuestion}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TakeQuiz; 