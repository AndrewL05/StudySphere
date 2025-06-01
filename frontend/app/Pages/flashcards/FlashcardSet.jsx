import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import { apiCall } from '../../config/api';
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: setData, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', id)
        .single();

      if (setError) throw setError;
      setSet(setData);
      
      // Check if current user is the owner
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
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setError('You need to log in to create flashcards');
        return;
      }

      // Check if user is the owner of this set
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
      // Check if user is the owner of this set
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
      // Check if user is the owner of this set
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

  if (loading) {
    return (
      <div className="flashcard-set-container">
        <div className="loading-spinner">Loading flashcard set...</div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="flashcard-set-container">
        <div className="error-message">Flashcard set not found</div>
      </div>
    );
  }

  return (
    <div className="flashcard-set-container">
      <div className="set-header">
        <div className="set-info">
          <Link to="/flashcards" className="back-link">← Back to Sets</Link>
          <h1>{set.title}</h1>
          {set.description && <p className="set-description">{set.description}</p>}
          <div className="set-meta">
            <span>{flashcards.length} cards</span>
            {set.is_public && <span className="public-badge">Public</span>}
          </div>
        </div>
        
        <div className="set-actions">
          {isOwner && (
            <button 
              className="add-card-btn"
              onClick={() => setShowCreateModal(true)}
            >
              + Add Card
            </button>
          )}
          <button 
            className="generate-ai-quiz-btn"
            onClick={() => {
              if (flashcards.length < 3) {
                setError('You need at least 3 flashcards to generate a quiz. This set has ' + flashcards.length + ' card(s).');
                // Clear error after 5 seconds
                setTimeout(() => setError(null), 5000);
                return;
              }
              handleGenerateAIQuiz();
            }}
            disabled={generatingQuiz}
          >
            {generatingQuiz ? (
              <span className="generating-text">
                <span className="spinner"></span>
                Generating...
              </span>
            ) : (
              <>
                🤖 Generate AI Quiz
              </>
            )}
          </button>
          <Link 
            to={`/flashcards/${id}/create-quiz`}
            className="create-quiz-btn"
            onClick={(e) => {
              if (flashcards.length < 3) {
                e.preventDefault();
                setError('You need at least 3 flashcards to create a quiz. This set has ' + flashcards.length + ' card(s).');
                // Clear error after 5 seconds
                setTimeout(() => setError(null), 5000);
                return;
              }
            }}
          >
            📝 Create Quiz
          </Link>
          <Link 
            to={`/flashcards/${id}/study`}
            className="study-btn"
          >
            Study
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="flashcards-list">
        {flashcards.length === 0 ? (
          <div className="empty-state">
            <h3>No flashcards yet</h3>
            {isOwner ? (
              <>
                <p>Add some flashcards to get started studying!</p>
                <button 
                  className="add-card-btn"
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
          flashcards.map(card => (
            <div key={card.id} className="flashcard-item">
              <div className="card-content">
                <div className="card-term">
                  <strong>Term:</strong> {card.term}
                </div>
                <div className="card-definition">
                  <strong>Definition:</strong> {card.definition}
                </div>
              </div>
              {isOwner && (
                <div className="card-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => setEditingCard(card)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteCard(card.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Card Modal */}
      {showCreateModal && isOwner && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Flashcard</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateCard}>
              <div className="form-group">
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
              
              <div className="form-group">
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
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && isOwner && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Flashcard</h2>
              <button 
                className="close-btn"
                onClick={() => setEditingCard(null)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateCard}>
              <div className="form-group">
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
              
              <div className="form-group">
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
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setEditingCard(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Update Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardSet;
