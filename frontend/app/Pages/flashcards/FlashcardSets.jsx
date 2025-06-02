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
      <div className="flashcard-sets-container">
        <div className="loading-spinner">Loading flashcard sets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flashcard-sets-container">
        <div className="auth-required-container">
          <div className="auth-required-content">
            <div className="auth-required-icon">🔒</div>
            <h2>Sign in to view your flashcard sets</h2>
            <p>Create and manage your personal flashcard collections to enhance your learning experience.</p>
            <div className="auth-required-actions">
              <button 
                className="primary-btn"
                onClick={() => navigate('/signin')}
              >
                Sign In
              </button>
              <button 
                className="secondary-btn"
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
    <div className="flashcard-sets-container">
      <div className="sets-header">
        <h1>My Flashcard Sets</h1>
        <button className="create-set-btn" onClick={handleCreateSet}>
          Create New Set
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="empty-state">
          <h3>No flashcard sets yet</h3>
          <p>Create your first flashcard set to start studying!</p>
          <button className="create-set-btn" onClick={handleCreateSet}>
            Create Your First Set
          </button>
        </div>
      ) : (
        <div className="sets-grid">
          {sets.map(set => (
            <Link to={`/flashcards/${set.id}`} key={set.id} className="set-card">
              <div className="set-card-content">
                <h3>{set.title}</h3>
                {set.description && <p className="set-description">{set.description}</p>}
                <div className="set-meta">
                  <span>{set.flashcards?.[0]?.count || 0} cards</span>
                  {set.is_public && <span className="public-badge">Public</span>}
                </div>
                <div className="set-actions">
                  <button className="study-btn">Study</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardSets;
