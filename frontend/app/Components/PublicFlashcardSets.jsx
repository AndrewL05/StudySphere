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
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        setError('Please sign in to generate AI quizzes');
        setGeneratingQuiz(null);
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
        return;
      }

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
      <div className="public-fc-section">
        <h3 className="public-fc-title">{title}</h3>
        <div className="feed-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="public-fc-section">
      <div className="public-fc-header">
        <h3 className="public-fc-title">{title}</h3>
        {showViewAllButton && (
          <Link to="/flashcards" className="fc-action-btn">
            View All
          </Link>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {sets.length === 0 ? (
        <div className="feed-empty">No public flashcard sets available.</div>
      ) : (
        <div className="public-fc-grid">
          {sets.map((set) => (
            <div key={set.id} className="public-fc-card">
              <Link to={`/flashcards/${set.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="public-fc-card-name">{set.title}</div>
                {set.description && (
                  <p className="fc-set-desc">{set.description}</p>
                )}
                <div className="public-fc-card-meta">
                  {set.flashcards?.[0]?.count || 0} cards
                </div>
              </Link>

              <div className="public-fc-card-actions">
                <Link
                  to={`/flashcards/${set.id}/study`}
                  className="public-fc-card-btn public-fc-study-btn"
                  title="Study this set"
                >
                  Study
                </Link>
                <button
                  className="public-fc-card-btn public-fc-quiz-btn"
                  onClick={() => handleGenerateAIQuiz(set)}
                  disabled={generatingQuiz === set.id}
                  title="Generate AI Quiz"
                >
                  {generatingQuiz === set.id ? '...' : 'AI Quiz'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicFlashcardSets;
