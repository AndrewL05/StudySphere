import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Flashcards.css';

const FlashcardSets = () => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndSets = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          setError('Please sign in to view your flashcard sets');
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: flashcardSets, error: setsError } = await supabase
          .from('flashcard_sets')
          .select('*, flashcards(count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (setsError) throw setsError;
        setSets(flashcardSets || []);
      } catch (err) {
        console.error('Error fetching flashcard sets:', err);
        setError('Failed to load flashcard sets');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSets();
  }, []);

  const handleCreateSet = () => {
    navigate('/flashcards/create');
  };

  if (loading) {
    return (
      <div className="fc-page">
        <div className="fc-container">
          <div className="feed-loading">Loading flashcard sets...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fc-page">
        <div className="fc-container">
          <div className="feed-empty">
            <h3>Sign in to view your flashcard sets</h3>
            <p>Create and manage your personal flashcard collections to enhance your learning experience.</p>
            <div className="form-actions">
              <button
                className="form-submit-btn"
                onClick={() => navigate('/signin')}
              >
                Sign In
              </button>
              <button
                className="form-cancel-btn"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-page">
      <div className="fc-container">
        <div className="fc-page-header">
          <h2 className="fc-page-title">My Flashcard Sets</h2>
          <button className="form-submit-btn" onClick={handleCreateSet}>
            Create New Set
          </button>
        </div>

        {sets.length === 0 ? (
          <div className="feed-empty">
            <h3>No flashcard sets yet</h3>
            <p>Create your first flashcard set to start studying!</p>
            <button className="form-submit-btn" onClick={handleCreateSet}>
              Create Your First Set
            </button>
          </div>
        ) : (
          <div className="fc-sets-grid">
            {sets.map(set => (
              <div key={set.id} className="fc-set-card" onClick={() => navigate(`/flashcards/${set.id}`)}>
                <h3 className="fc-set-name">{set.title}</h3>
                {set.description && <p className="fc-set-desc">{set.description}</p>}
                <div className="fc-set-meta">
                  <span>{set.flashcards?.[0]?.count || 0} cards</span>
                  {set.is_public && <span className="fc-set-badge">Public</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardSets;
