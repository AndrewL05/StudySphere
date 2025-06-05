import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Flashcards.css';

const StudyMode = () => {
  const { id } = useParams();
  const [set, setSet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  });
  const [isComplete, setIsComplete] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    fetchSetAndCards();
  }, [id]);

  const fetchSetAndCards = async () => {
    try {
      const { data: setData, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', id)
        .single();

      if (setError) throw setError;
      setSet(setData);

      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', id)
        .order('created_at', { ascending: true });

      if (cardsError) throw cardsError;
      setFlashcards(cardsData || []);
      setStudyStats(prev => ({ ...prev, total: cardsData?.length || 0 }));
    } catch (err) {
      console.error('Error fetching flashcard set:', err);
      setError('Failed to load flashcard set');
    } finally {
      setLoading(false);
    }
  };

  const shuffleCards = () => {
    const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffledCards);
    setCurrentIndex(0);
    setShowDefinition(false);
    setShuffled(true);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDefinition(false);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDefinition(false);
    }
  };

  const handleKnowCard = () => {
    setStudyStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    handleNext();
  };

  const handleDontKnowCard = () => {
    setStudyStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    handleNext();
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setShowDefinition(false);
    setIsComplete(false);
    setStudyStats({ correct: 0, incorrect: 0, total: flashcards.length });
  };

  const flipCard = () => {
    setShowDefinition(!showDefinition);
  };

  // Helper function to determine content length class
  const getContentLengthClass = (text) => {
    if (!text) return '';
    const length = text.length;
    if (length > 200) return 'very-long-content';
    if (length > 100) return 'long-content';
    return '';
  };

  if (loading) {
    return (
      <div className="study-container">
        <div className="loading-spinner">Loading study session...</div>
      </div>
    );
  }

  if (!set || flashcards.length === 0) {
    return (
      <div className="study-container">
        <div className="empty-study">
          <h2>No flashcards to study</h2>
          <p>This set doesn't have any flashcards yet.</p>
          <Link to={`/flashcards/${id}`} className="back-to-set-btn">
            Back to Set
          </Link>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="study-container">
        <div className="study-complete">
          <h2>🎉 Study Session Complete!</h2>
          <div className="final-stats">
            <div className="stat-item">
              <span className="stat-number">{studyStats.correct}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{studyStats.incorrect}</span>
              <span className="stat-label">Incorrect</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{studyStats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="accuracy">
            Accuracy: {studyStats.total > 0 ? Math.round((studyStats.correct / studyStats.total) * 100) : 0}%
          </div>
          <div className="study-actions">
            <button className="study-again-btn" onClick={resetStudy}>
              Study Again
            </button>
            <button className="shuffle-study-btn" onClick={() => { shuffleCards(); resetStudy(); }}>
              Shuffle & Study
            </button>
            <Link to={`/flashcards/${id}`} className="back-to-set-btn">
              Back to Set
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="study-container">
      <div className="study-header">
        <Link to={`/flashcards/${id}`} className="back-link">← Back to Set</Link>
        <h1>Studying: {set.title}</h1>
        <div className="study-controls">
          <button 
            className="shuffle-btn" 
            onClick={shuffleCards}
            disabled={shuffled}
          >
            🔀 Shuffle
          </button>
        </div>
      </div>

      <div className="study-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {currentIndex + 1} of {flashcards.length}
        </div>
      </div>

      <div className="study-stats">
        <div className="stat">
          <span className="stat-value">{studyStats.correct}</span>
          <span className="stat-label">Correct</span>
        </div>
        <div className="stat">
          <span className="stat-value">{studyStats.incorrect}</span>
          <span className="stat-label">Incorrect</span>
        </div>
      </div>

      <div className="flashcard-study">
        <div className={`study-card ${showDefinition ? 'flipped' : ''}`} onClick={flipCard}>
          <div className="card-inner">
            <div className="card-front">
              <div className="card-content">
                <div className="card-label">Term</div>
                <div className={`card-text ${getContentLengthClass(currentCard.term)}`}>
                  {currentCard.term}
                </div>
              </div>
              <div className="flip-hint">Click to reveal definition</div>
            </div>
            <div className="card-back">
              <div className="card-content">
                <div className="card-label">Definition</div>
                <div className={`card-text ${getContentLengthClass(currentCard.definition)}`}>
                  {currentCard.definition}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="study-navigation">
        <button 
          className="nav-btn prev-btn" 
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>
        
        {showDefinition && (
          <div className="knowledge-buttons">
            <button className="dont-know-btn" onClick={handleDontKnowCard}>
              😕 Don't Know
            </button>
            <button className="know-btn" onClick={handleKnowCard}>
              😊 I Know This
            </button>
          </div>
        )}
        
        <button 
          className="nav-btn next-btn" 
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next →
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default StudyMode;
