import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import { apiCall } from '../config/api';
import './PublicFlashcardSets.css';

const PublicFlashcardSets = ({ title = "Public Flashcard Sets", showViewAllButton = false }) => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(null);

  useEffect(() => {
    fetchPublicSets();
  }, []);

  const fetchPublicSets = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*, flashcards(count)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSets(data || []);
    } catch (err) {
      console.error('Error fetching public flashcard sets:', err);
      setError('Failed to load public flashcard sets');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIQuiz = async (set) => {
    setGeneratingQuiz(set.id);
    setError(null);

    try {
      const cardCount = set.flashcards?.[0]?.count || 0;
      if (cardCount < 3) {
        setError(`You need at least 3 flashcards to generate a quiz. This set has ${cardCount} card(s).`);
        setGeneratingQuiz(null);
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Call backend API to create AI quiz using apiCall helper
      const result = await apiCall('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${set.title} - AI Generated Quiz`,
          description: `Intelligent quiz generated from ${set.title} flashcard set`,
          flashcard_set_id: set.id,
          quiz_type: 'multiple_choice',
          question_count: Math.min(10, cardCount),
          time_limit: null,
          is_public: false,
          use_ai_generation: true
        })
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI quiz');
      }

      navigate(`/quizzes/${result.data.id}`);
    } catch (err) {
      console.error('Error generating AI quiz:', err);
      setError(err.message || 'Failed to generate AI quiz');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setGeneratingQuiz(null);
    }
  };

  if (loading) {
    return (
      <div className="public-flashcard-sets">
        <h3>{title}</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="public-flashcard-sets">
      <div className="section-header">
        <h3>{title}</h3>
        {showViewAllButton && (
          <Link to="/flashcards" className="view-all-link">
            View All
          </Link>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {sets.length === 0 ? (
        <p className="no-sets">No public flashcard sets available.</p>
      ) : (
        <div className="sets-list">
          {sets.map((set) => (
            <div key={set.id} className="set-item">
              <div className="set-content">
                <Link to={`/flashcards/${set.id}`} className="set-link">
                  <h4 className="set-title">{set.title}</h4>
                  {set.description && (
                    <p className="set-description">{set.description}</p>
                  )}
                  <div className="set-meta">
                    <span>{set.flashcards?.[0]?.count || 0} cards</span>
                    <span className="public-badge">Public</span>
                  </div>
                </Link>
                
                <div className="set-actions">
                  <button 
                    className="generate-ai-quiz-btn"
                    onClick={() => handleGenerateAIQuiz(set)}
                    disabled={generatingQuiz === set.id}
                    title="Generate AI Quiz"
                  >
                    {generatingQuiz === set.id ? (
                      <span className="generating-text">
                        <span className="spinner"></span>
                        ...
                      </span>
                    ) : (
                      '🤖'
                    )}
                  </button>
                  <Link 
                    to={`/flashcards/${set.id}/study`}
                    className="study-btn"
                    title="Study this set"
                  >
                    📚
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicFlashcardSets; 