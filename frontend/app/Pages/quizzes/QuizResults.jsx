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

  useEffect(() => {
    fetchResults();
  }, [quizId, attemptId]);

  const fetchResults = async () => {
    try {
      // Fetch quiz attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      setAttempt(attemptData);

      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          flashcard_sets (title, description)
        `)
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

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
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return '#10b981'; // green
    if (percentage >= 80) return '#3b82f6'; // blue
    if (percentage >= 70) return '#f59e0b'; // yellow
    if (percentage >= 60) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getGradeMessage = (percentage) => {
    if (percentage >= 90) return 'Excellent! 🎉';
    if (percentage >= 80) return 'Great job! 👏';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Keep practicing! 📚';
    return 'Study more and try again! 💪';
  };

  if (loading) {
    return (
      <div className="study-container">
        <div className="loading-spinner">Loading results...</div>
      </div>
    );
  }

  if (error || !attempt || !quiz) {
    return (
      <div className="study-container">
        <div className="empty-study">
          <h2>Results not found</h2>
          <p>Could not load quiz results.</p>
          <Link to="/flashcards" className="back-to-set-btn">
            Back to Flashcard Sets
          </Link>
        </div>
      </div>
    );
  }

  const userAnswers = attempt.answers || {};
  const correctCount = questions.filter(q => userAnswers[q.id] === q.correct_answer).length;
  const incorrectCount = questions.length - correctCount;

  return (
    <div className="fc-page">
      <div className="fc-form-container">
        <div className="quiz-results-card">
          <h1 className="quiz-results-score" style={{ color: getScoreColor(attempt.percentage) }}>
            {Math.round(attempt.percentage)}%
          </h1>
          <p className="quiz-results-grade">{getGradeMessage(attempt.percentage)}</p>

          <div className="quiz-results-stats">
            <div className="quiz-stat">
              <span className="quiz-stat-value correct-stat">{correctCount}</span>
              <span className="quiz-stat-label">Correct</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-value incorrect-stat">{incorrectCount}</span>
              <span className="quiz-stat-label">Incorrect</span>
            </div>
          </div>

          <div className="quiz-results-actions">
            <Link to={`/quizzes/${quizId}`}>Retake Quiz</Link>
            <Link to={`/flashcards/${quiz.flashcard_set_id}`}>Back to Flashcards</Link>
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
                <p className="quiz-review-question">Q{index + 1}. {question.question_text}</p>
                <p className="quiz-review-answer">Your answer: {userAnswer || 'No answer'}</p>
                {!isCorrect && (
                  <p className="quiz-review-correct">Correct: {question.correct_answer}</p>
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