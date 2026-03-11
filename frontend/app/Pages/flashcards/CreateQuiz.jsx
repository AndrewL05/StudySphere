import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import { apiCall } from '../../config/api';
import './Flashcards.css';

const CreateQuiz = () => {
  const { id } = useParams(); // flashcard set id
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    quiz_type: 'multiple_choice',
    question_count: 10,
    time_limit: null,
    is_public: false,
    use_ai_generation: false
  });

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
        .eq('set_id', id);

      if (cardsError) throw cardsError;
      setFlashcards(cardsData || []);

      // Set default quiz title
      setQuizData(prev => ({
        ...prev,
        title: `${setData.title} Quiz`,
        question_count: Math.min(10, cardsData?.length || 0)
      }));
    } catch (err) {
      console.error('Error fetching flashcard set:', err);
      setError('Failed to load flashcard set');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      // Call backend API to create quiz using apiCall helper
      const result = await apiCall('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: quizData.title,
          description: quizData.description,
          flashcard_set_id: id,
          quiz_type: quizData.quiz_type,
          question_count: parseInt(quizData.question_count),
          time_limit: quizData.time_limit ? parseInt(quizData.time_limit) : null,
          is_public: quizData.is_public,
          use_ai_generation: quizData.use_ai_generation
        })
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create quiz');
      }

      navigate(`/quizzes/${result.data.id}`);
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err.message || 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <div className="feed-loading">Loading flashcard set...</div>
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <div className="form-error">Flashcard set not found</div>
          <Link to="/flashcards" className="fc-back-link">Back to Flashcard Sets</Link>
        </div>
      </div>
    );
  }

  if (flashcards.length < 3) {
    return (
      <div className="fc-page">
        <div className="fc-form-container">
          <div className="feed-empty">
            <h3>Not enough flashcards</h3>
            <p>You need at least 3 flashcards to create a quiz. This set has {flashcards.length} flashcard(s).</p>
            <Link to={`/flashcards/${id}`} className="fc-back-link">Back to Flashcard Set</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-page">
      <div className="fc-form-container">
        <Link to={`/flashcards/${id}`} className="fc-back-link">Back to {set.title}</Link>
        <h2 className="fc-page-title">Create Quiz</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
          Generate an interactive quiz from your flashcard set
        </p>

        <form onSubmit={handleSubmit} className="fc-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-field">
            <label htmlFor="title">Quiz Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={quizData.title}
              onChange={handleInputChange}
              placeholder="Enter quiz title"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={quizData.description}
              onChange={handleInputChange}
              placeholder="Enter quiz description"
              rows="3"
            />
          </div>

          <div className="form-field">
            <label htmlFor="quiz_type">Quiz Type</label>
            <select
              id="quiz_type"
              name="quiz_type"
              value={quizData.quiz_type}
              onChange={handleInputChange}
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
              Multiple Choice: Choose from 4 options | True/False: Verify pairs | Fill in the Blank: Type the answer
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-field">
              <label htmlFor="question_count">Number of Questions</label>
              <input
                type="number"
                id="question_count"
                name="question_count"
                value={quizData.question_count}
                onChange={handleInputChange}
                min="3"
                max={flashcards.length}
                required
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Available: {flashcards.length}
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="time_limit">Time Limit (minutes)</label>
              <input
                type="number"
                id="time_limit"
                name="time_limit"
                value={quizData.time_limit || ''}
                onChange={handleInputChange}
                min="1"
                max="120"
                placeholder="No limit"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Leave empty for no time limit
              </span>
            </div>
          </div>

          <div className="form-field">
            <label>AI Enhancement</label>
            <div className="fc-toggle">
              <button
                type="button"
                className={`fc-toggle-switch ${quizData.use_ai_generation ? 'active' : ''}`}
                onClick={() => setQuizData(prev => ({ ...prev, use_ai_generation: !prev.use_ai_generation }))}
              />
              <span className="fc-toggle-label">AI-Powered Question Generation</span>
            </div>
            {quizData.use_ai_generation && (
              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                AI generation creates more sophisticated questions with intelligent distractors. May take a bit longer.
              </div>
            )}
          </div>

          <div className="fc-toggle">
            <button
              type="button"
              className={`fc-toggle-switch ${quizData.is_public ? 'active' : ''}`}
              onClick={() => setQuizData(prev => ({ ...prev, is_public: !prev.is_public }))}
            />
            <span className="fc-toggle-label">Make this quiz public</span>
          </div>

          <div className="form-actions">
            <Link to={`/flashcards/${id}`} className="form-cancel-btn">
              Cancel
            </Link>
            <button
              type="submit"
              className="form-submit-btn"
              disabled={creating}
            >
              {creating ? (quizData.use_ai_generation ? 'Generating with AI...' : 'Creating Quiz...') : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuiz;
