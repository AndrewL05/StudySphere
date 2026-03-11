import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Flashcards.css';

const CreateFlashcardSet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setError('You need to log in to create a flashcard set');
        setLoading(false);
        return;
      }

      const { data, error: createError } = await supabase
        .from('flashcard_sets')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            is_public: formData.is_public,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      navigate(`/flashcards/${data.id}`);
    } catch (err) {
      console.error('Error creating flashcard set:', err);
      setError('Failed to create flashcard set');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fc-page">
      <div className="fc-form-container">
        <h2 className="fc-page-title">Create New Flashcard Set</h2>

        <form onSubmit={handleSubmit} className="fc-form">
          <div className="form-field">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter set title"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter set description (optional)"
              rows="4"
            />
          </div>

          <div className="fc-toggle">
            <button
              type="button"
              className={`fc-toggle-switch ${formData.is_public ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
            />
            <span className="fc-toggle-label">Make this set public</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            Public sets can be viewed and studied by other users
          </p>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="form-cancel-btn"
              onClick={() => navigate('/flashcards')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="form-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFlashcardSet;
