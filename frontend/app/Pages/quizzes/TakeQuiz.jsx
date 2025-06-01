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
    <div className="study-container">
      <div className="study-header">
        <h1>{quiz.title}</h1>
        {timeLeft !== null && (
          <div className={`timer ${timeLeft <= 300 ? 'warning' : ''}`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="study-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="quiz-question">
        <div className="question-card">
          <h3>{currentQuestion.question_text}</h3>
          
          <div className="answer-options">
            {currentQuestion.question_type === 'multiple_choice' && (
              <div className="multiple-choice">
                {shuffledOptions[currentQuestion.id]?.map((option, index) => (
                  <label key={index} className="option-label">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(currentQuestion.id, option)}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="true-false">
                <label className="option-label">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="True"
                    checked={answers[currentQuestion.id] === 'True'}
                    onChange={() => handleAnswerChange(currentQuestion.id, 'True')}
                  />
                  <span className="option-text">True</span>
                </label>
                <label className="option-label">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="False"
                    checked={answers[currentQuestion.id] === 'False'}
                    onChange={() => handleAnswerChange(currentQuestion.id, 'False')}
                  />
                  <span className="option-text">False</span>
                </label>
              </div>
            )}

            {currentQuestion.question_type === 'fill_blank' && (
              <div className="fill-blank">
                <input
                  type="text"
                  placeholder="Enter your answer"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="answer-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="quiz-navigation">
        <button 
          className="nav-btn prev-btn" 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          ← Previous
        </button>
        
        <div className="nav-center">
          {isLastQuestion ? (
            <button 
              className="submit-quiz-btn" 
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button 
              className="nav-btn next-btn" 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            >
              Next →
            </button>
          )}
        </div>
        
        <div className="answered-count">
          {Object.keys(answers).length}/{questions.length} answered
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz; 