import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Flashcards.css';

const StudyMode = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const handleNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDefinition(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, flashcards.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDefinition(false);
    }
  }, [currentIndex]);

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

  const flipCard = useCallback(() => {
    setShowDefinition(prev => !prev);
  }, []);

  const handleExit = useCallback(() => {
    navigate(`/flashcards/${id}`);
  }, [navigate, id]);

  // Helper function to determine content length class
  const getContentLengthClass = (text) => {
    if (!text) return '';
    const length = text.length;
    if (length > 200) return 'very-long-content';
    if (length > 100) return 'long-content';
    return '';
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') { e.preventDefault(); flipCard(); }
      if (e.key === 'Escape') handleExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, flipCard, handleExit]);

  if (loading) {
    return (
      <div className="study-immersive">
        <div className="study-loading">
          <div className="loading-spinner"></div>
          <p>Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="study-immersive">
        <div className="study-loading">
          <p>{error}</p>
          <Link to={`/flashcards/${id}`} className="fc-action-btn">Back to Set</Link>
        </div>
      </div>
    );
  }

  if (!set || flashcards.length === 0) {
    return (
      <div className="study-immersive">
        <div className="study-loading">
          <p>No flashcards to study. This set doesn't have any flashcards yet.</p>
          <Link to={`/flashcards/${id}`} className="fc-action-btn">Back to Set</Link>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = studyStats.total > 0 ? Math.round((studyStats.correct / studyStats.total) * 100) : 0;
    return (
      <div className="study-immersive">
        <div className="study-progress-bar">
          <div className="study-progress-fill" style={{ width: '100%' }} />
        </div>

        <div className="study-top-bar">
          <button className="study-exit-btn" onClick={handleExit} title="Exit">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <span className="study-counter">{flashcards.length} / {flashcards.length}</span>
        </div>

        <div className="study-summary">
          <h2 className="study-summary-title">Study Session Complete!</h2>
          <div className="study-summary-stats">
            <div className="study-stat">
              <span className="study-stat-value correct-stat">{studyStats.correct}</span>
              <span className="study-stat-label">Correct</span>
            </div>
            <div className="study-stat">
              <span className="study-stat-value incorrect-stat">{studyStats.incorrect}</span>
              <span className="study-stat-label">Incorrect</span>
            </div>
            <div className="study-stat">
              <span className="study-stat-value">{accuracy}%</span>
              <span className="study-stat-label">Accuracy</span>
            </div>
          </div>
          <div className="study-summary-actions">
            <button className="study-rating-btn correct" onClick={resetStudy}>Study Again</button>
            <button className="study-rating-btn incorrect" onClick={() => { shuffleCards(); resetStudy(); }}>Shuffle &amp; Study</button>
            <Link to={`/flashcards/${id}`} className="study-rating-btn incorrect">Back to Set</Link>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="study-immersive">
      {/* Progress bar at very top */}
      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Top bar */}
      <div className="study-top-bar">
        <button className="study-exit-btn" onClick={handleExit} title="Exit">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button className="study-shuffle-btn" onClick={shuffleCards} disabled={shuffled}>Shuffle</button>
        <span className="study-counter">{currentIndex + 1} / {flashcards.length}</span>
      </div>

      {/* Center: Flashcard */}
      <div className="study-card-area">
        <div className={`study-card ${showDefinition ? 'flipped' : ''}`} onClick={flipCard}>
          <div className="study-card-inner">
            <div className="study-card-front">
              <p className="study-card-label">Term</p>
              <p className={`study-card-text ${getContentLengthClass(currentCard.term)}`}>{currentCard.term}</p>
            </div>
            <div className="study-card-back">
              <p className="study-card-label">Definition</p>
              <p className={`study-card-text ${getContentLengthClass(currentCard.definition)}`}>{currentCard.definition}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="study-controls">
        <button className="study-nav-btn" onClick={handlePrevious} disabled={currentIndex === 0} title="Previous (←)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {showDefinition && (
          <div className="study-rating-btns">
            <button className="study-rating-btn incorrect" onClick={handleDontKnowCard}>Still Learning</button>
            <button className="study-rating-btn correct" onClick={handleKnowCard}>Know It</button>
          </div>
        )}

        <button className="study-nav-btn" onClick={handleNext} disabled={currentIndex === flashcards.length - 1} title="Next (→)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StudyMode;
