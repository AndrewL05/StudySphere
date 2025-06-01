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
      <div className="create-set-container">
        <div className="loading-spinner">Loading flashcard set...</div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="create-set-container">
        <div className="error-message">Flashcard set not found</div>
        <Link to="/flashcards" className="back-link">← Back to Flashcard Sets</Link>
      </div>
    );
  }

  if (flashcards.length < 3) {
    return (
      <div className="create-set-container">
        <div className="empty-state">
          <h3>Not enough flashcards</h3>
          <p>You need at least 3 flashcards to create a quiz. This set has {flashcards.length} flashcard(s).</p>
          <Link to={`/flashcards/${id}`} className="back-link">← Back to Flashcard Set</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="create-set-container">
      <div className="create-set-header">
        <Link to={`/flashcards/${id}`} className="back-link">← Back to {set.title}</Link>
        <h1>Create Quiz</h1>
        <p className="quiz-subtitle">Generate an interactive quiz from your flashcard set</p>
      </div>

      <form onSubmit={handleSubmit} className="create-set-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <h3 className="section-title">📝 Basic Information</h3>
          
          <div className="form-group">
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

          <div className="form-group">
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
        </div>

        <div className="form-section">
          <h3 className="section-title">⚙️ Quiz Settings</h3>

          <div className="form-group">
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
            <div className="help-text">
              <strong>Multiple Choice:</strong> Choose the correct definition from 4 options<br/>
              <strong>True/False:</strong> Determine if term-definition pairs are correct<br/>
              <strong>Fill in the Blank:</strong> Type the missing definition
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
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
              <div className="help-text">
                Available flashcards: {flashcards.length}
              </div>
            </div>

            <div className="form-group">
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
              <div className="help-text">
                Leave empty for no time limit
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">🤖 AI Enhancement</h3>
          
          <div className="ai-toggle-card">
            <div className="toggle-header">
              <div className="toggle-info">
                <h4>🧠 AI-Powered Question Generation</h4>
                <p>Let AI create more sophisticated and challenging questions from your flashcards</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="use_ai_generation"
                  checked={quizData.use_ai_generation}
                  onChange={handleInputChange}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            {quizData.use_ai_generation && (
              <div className="ai-features">
                <div className="feature-list">
                  <div className="feature-item">
                    <span className="feature-icon">✨</span>
                    <span>Intelligent distractor generation</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span>Context-aware question variations</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🧪</span>
                    <span>Advanced difficulty balancing</span>
                  </div>
                </div>
                <div className="ai-note">
                  <strong>Note:</strong> AI generation may take a bit longer but produces higher quality questions.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">🌐 Sharing Settings</h3>
          
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={quizData.is_public}
              onChange={handleInputChange}
            />
            <label htmlFor="is_public">
              <span className="checkbox-text">
                <strong>Make this quiz public</strong>
                <div className="help-text">
                  Public quizzes can be discovered and taken by other users
                </div>
              </span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <Link to={`/flashcards/${id}`} className="cancel-btn">
            Cancel
          </Link>
          <button 
            type="submit" 
            className="create-btn"
            disabled={creating}
          >
            {creating ? (
              <span className="creating-text">
                <span className="spinner"></span>
                {quizData.use_ai_generation ? 'Generating with AI...' : 'Creating Quiz...'}
              </span>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Create Quiz
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuiz; 