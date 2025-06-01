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

  return (
    <div className="study-container">
      <div className="study-complete">
        <h2>Quiz Results</h2>
        <h3>{quiz.title}</h3>
        
        <div className="final-stats">
          <div className="stat-item">
            <span 
              className="stat-number" 
              style={{ color: getScoreColor(attempt.percentage) }}
            >
              {Math.round(attempt.percentage)}%
            </span>
            <span className="stat-label">Score</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{attempt.score}</span>
            <span className="stat-label">Points Earned</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{attempt.total_questions}</span>
            <span className="stat-label">Total Questions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{formatTime(attempt.time_taken)}</span>
            <span className="stat-label">Time Taken</span>
          </div>
        </div>

        <div className="grade-message">
          {getGradeMessage(attempt.percentage)}
        </div>

        <div className="results-breakdown">
          <h4>Question Breakdown</h4>
          <div className="questions-review">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question.id];
              const isCorrect = userAnswer === question.correct_answer;
              
              return (
                <div key={question.id} className={`question-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    <span className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                  
                  <div className="question-content">
                    <p className="question-text">{question.question_text}</p>
                    
                    <div className="answer-review">
                      <div className="user-answer">
                        <strong>Your answer:</strong> 
                        <span className={isCorrect ? 'correct-answer' : 'wrong-answer'}>
                          {userAnswer || 'No answer'}
                        </span>
                      </div>
                      
                      {!isCorrect && (
                        <div className="correct-answer-display">
                          <strong>Correct answer:</strong> 
                          <span className="correct-answer">{question.correct_answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="study-actions">
          <Link 
            to={`/quizzes/${quizId}`} 
            className="study-again-btn"
          >
            Retake Quiz
          </Link>
          <Link 
            to={`/flashcards/${quiz.flashcard_set_id}/study`} 
            className="shuffle-study-btn"
          >
            Study Flashcards
          </Link>
          <Link 
            to={`/flashcards/${quiz.flashcard_set_id}`} 
            className="back-to-set-btn"
          >
            Back to Set
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResults; 