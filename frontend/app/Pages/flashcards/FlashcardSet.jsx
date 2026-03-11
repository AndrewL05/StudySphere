import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import { apiCall } from '../../config/api';
import { shareFlashcardSet } from '../../Services/shareService';
import './Flashcards.css';

const FlashcardSet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [newCard, setNewCard] = useState({ term: '', definition: '' });
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchSetAndCards();
  }, [id]);

  const fetchSetAndCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: setData, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', id)
        .single();

      if (setError) throw setError;
      setSet(setData);

      setIsOwner(user && setData.user_id === user.id);

      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', id)
        .order('created_at', { ascending: true });

      if (cardsError) throw cardsError;
      setFlashcards(cardsData || []);
    } catch (err) {
      console.error('Error fetching flashcard set:', err);
      setError('Failed to load flashcard set');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCard.term.trim() || !newCard.definition.trim()) return;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setError('You need to log in to create flashcards');
        return;
      }

      if (!isOwner) {
        setError('You can only add cards to your own flashcard sets');
        return;
      }

      const { data, error } = await supabase
        .from('flashcards')
        .insert([
          {
            set_id: id,
            term: newCard.term.trim(),
            definition: newCard.definition.trim()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setFlashcards([...flashcards, data]);
      setNewCard({ term: '', definition: '' });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating flashcard:', err);
      setError('Failed to create flashcard');
    }
  };

  const handleUpdateCard = async (e) => {
    e.preventDefault();
    if (!editingCard.term.trim() || !editingCard.definition.trim()) return;

    try {
      if (!isOwner) {
        setError('You can only edit cards in your own flashcard sets');
        return;
      }

      const { data, error } = await supabase
        .from('flashcards')
        .update({
          term: editingCard.term.trim(),
          definition: editingCard.definition.trim()
        })
        .eq('id', editingCard.id)
        .select()
        .single();

      if (error) throw error;

      setFlashcards(flashcards.map(card =>
        card.id === editingCard.id ? data : card
      ));
      setEditingCard(null);
    } catch (err) {
      console.error('Error updating flashcard:', err);
      setError('Failed to update flashcard');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this flashcard?')) return;

    try {
      if (!isOwner) {
        setError('You can only delete cards from your own flashcard sets');
        return;
      }

      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      setFlashcards(flashcards.filter(card => card.id !== cardId));
    } catch (err) {
      console.error('Error deleting flashcard:', err);
      setError('Failed to delete flashcard');
    }
  };

  const handleGenerateAIQuiz = async () => {
    setGeneratingQuiz(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        setError('Please sign in to generate AI quizzes');
        setGeneratingQuiz(false);
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Call backend API to create AI quiz using apiCall helper
      const result = await apiCall('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${set.title} - AI Generated Quiz`,
          description: `Intelligent quiz generated from ${set.title} flashcard set`,
          flashcard_set_id: id,
          quiz_type: 'multiple_choice',
          question_count: Math.min(10, flashcards.length),
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
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleShare = async () => {
    await shareFlashcardSet({
      id: set.id,
      title: set.title,
      description: set.description,
      flashcards: flashcards,
      card_count: flashcards.length,
      type: 'flashcard-set'
    });
  };

  if (loading) {
    return (
      <div className="fc-page">
        <div className="fc-container">
          <div className="feed-loading">Loading flashcard set...</div>
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="fc-page">
        <div className="fc-container">
          <div className="form-error">Flashcard set not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-page">
      <div className="fc-container">
        <div className="fc-detail-header">
          <Link to="/flashcards" className="fc-back-link">Back to Sets</Link>
          <h1 className="fc-detail-title">{set.title}</h1>
          {set.description && <p className="fc-detail-desc">{set.description}</p>}
          <div className="fc-set-meta" style={{ marginBottom: 'var(--space-4)' }}>
            <span>{flashcards.length} cards</span>
            {set.is_public && <span className="fc-set-badge">Public</span>}
          </div>

          <div className="fc-detail-actions">
            <Link
              to={`/flashcards/${id}/study`}
              className="fc-action-btn primary"
            >
              Study
            </Link>
            {isOwner && (
              <button
                className="fc-action-btn"
                onClick={() => setShowCreateModal(true)}
              >
                + Add Card
              </button>
            )}
            <button
              className="fc-action-btn"
              onClick={() => {
                if (flashcards.length < 3) {
                  setError('You need at least 3 flashcards to generate a quiz. This set has ' + flashcards.length + ' card(s).');
                  setTimeout(() => setError(null), 5000);
                  return;
                }
                handleGenerateAIQuiz();
              }}
              disabled={generatingQuiz}
            >
              {generatingQuiz ? 'Generating...' : 'AI Quiz'}
            </button>
            <Link
              to={`/flashcards/${id}/create-quiz`}
              className="fc-action-btn"
              onClick={(e) => {
                if (flashcards.length < 3) {
                  e.preventDefault();
                  setError('You need at least 3 flashcards to create a quiz. This set has ' + flashcards.length + ' card(s).');
                  setTimeout(() => setError(null), 5000);
                  return;
                }
              }}
            >
              Create Quiz
            </Link>
            <button
              className="fc-action-btn"
              onClick={handleShare}
              title="Share flashcard set"
            >
              Share
            </button>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {flashcards.length === 0 ? (
          <div className="feed-empty">
            <h3>No flashcards yet</h3>
            {isOwner ? (
              <>
                <p>Add some flashcards to get started studying!</p>
                <button
                  className="form-submit-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  Add Your First Card
                </button>
              </>
            ) : (
              <p>This flashcard set doesn't have any cards yet.</p>
            )}
          </div>
        ) : (
          <div className="fc-cards-grid">
            {flashcards.map(card => (
              <div key={card.id} className="fc-card-item">
                <div className="fc-card-front">{card.term}</div>
                <div className="fc-card-back">{card.definition}</div>
                {isOwner && (
                  <div className="fc-card-actions">
                    <button
                      className="fc-card-edit-btn"
                      onClick={() => setEditingCard(card)}
                    >
                      Edit
                    </button>
                    <button
                      className="fc-card-delete-btn"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Card Modal */}
        {showCreateModal && isOwner && (
          <div className="fc-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="fc-modal-title">Add New Flashcard</h2>

              <form onSubmit={handleCreateCard}>
                <div className="form-field">
                  <label htmlFor="term">Term *</label>
                  <input
                    type="text"
                    id="term"
                    value={newCard.term}
                    onChange={(e) => setNewCard({...newCard, term: e.target.value})}
                    placeholder="Enter the term"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="definition">Definition *</label>
                  <textarea
                    id="definition"
                    value={newCard.definition}
                    onChange={(e) => setNewCard({...newCard, definition: e.target.value})}
                    placeholder="Enter the definition"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="form-cancel-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="form-submit-btn">
                    Add Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Card Modal */}
        {editingCard && isOwner && (
          <div className="fc-modal-overlay" onClick={() => setEditingCard(null)}>
            <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="fc-modal-title">Edit Flashcard</h2>

              <form onSubmit={handleUpdateCard}>
                <div className="form-field">
                  <label htmlFor="edit-term">Term *</label>
                  <input
                    type="text"
                    id="edit-term"
                    value={editingCard.term}
                    onChange={(e) => setEditingCard({...editingCard, term: e.target.value})}
                    placeholder="Enter the term"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-definition">Definition *</label>
                  <textarea
                    id="edit-definition"
                    value={editingCard.definition}
                    onChange={(e) => setEditingCard({...editingCard, definition: e.target.value})}
                    placeholder="Enter the definition"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="form-cancel-btn"
                    onClick={() => setEditingCard(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="form-submit-btn">
                    Update Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardSet;
