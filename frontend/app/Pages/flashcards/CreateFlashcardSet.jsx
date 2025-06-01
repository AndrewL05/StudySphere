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
    <div className="create-set-container">
      <div className="create-set-header">
        <h1>Create New Flashcard Set</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="create-set-form">
        <div className="form-group">
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

        <div className="form-group">
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

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
            />
            Make this set public
          </label>
          <p className="help-text">
            Public sets can be viewed and studied by other users
          </p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/flashcards')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-btn"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Set'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlashcardSet; 