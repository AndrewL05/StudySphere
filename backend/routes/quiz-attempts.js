import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

// GET /api/quiz-attempts - Get user's quiz attempts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { quiz_id, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes (
          id,
          title,
          quiz_type,
          flashcard_sets (
            id,
            title
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (quiz_id) {
      query = query.eq('quiz_id', quiz_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz attempts'
    });
  }
});

// GET /api/quiz-attempts/:id - Get specific quiz attempt
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes (
          id,
          title,
          quiz_type,
          flashcard_sets (
            id,
            title
          )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Quiz attempt not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz attempt'
    });
  }
});

// POST /api/quiz-attempts - Start new quiz attempt
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { quiz_id } = req.body;

    if (!quiz_id) {
      return res.status(400).json({
        success: false,
        error: 'Quiz ID is required'
      });
    }

    // Verify quiz exists and user has access
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quiz_id)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Check access (public quiz or user owns it)
    const hasAccess = quiz.is_public || quiz.user_id === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this quiz'
      });
    }

    // Get question count
    const { count: questionCount, error: countError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quiz_id);

    if (countError) throw countError;

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id,
        user_id: req.user.id,
        total_questions: questionCount || 0,
        answers: {}
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    res.status(201).json({
      success: true,
      data: attempt
    });
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start quiz attempt'
    });
  }
});

// PUT /api/quiz-attempts/:id - Update quiz attempt (save progress)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { answers, is_completed = false } = req.body;

    const updateData = {
      answers,
      updated_at: new Date().toISOString()
    };

    // If completing the quiz, calculate score
    if (is_completed) {
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (
            id,
            quiz_questions (
              id,
              correct_answer,
              points
            )
          )
        `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (attemptError || !attempt) {
        return res.status(404).json({
          success: false,
          error: 'Quiz attempt not found'
        });
      }

      // Calculate score
      let score = 0;
      const questions = attempt.quizzes.quiz_questions;
      
      questions.forEach(question => {
        const userAnswer = answers[question.id];
        if (userAnswer === question.correct_answer) {
          score += question.points;
        }
      });

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

      updateData.score = score;
      updateData.percentage = percentage.toFixed(2);
      updateData.is_completed = true;
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Quiz attempt not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating quiz attempt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quiz attempt'
    });
  }
});

// POST /api/quiz-attempts/:id/submit - Submit completed quiz
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers, time_taken } = req.body;

    // Get attempt and questions
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes (
          id,
          quiz_questions (
            id,
            correct_answer,
            points
          )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({
        success: false,
        error: 'Quiz attempt not found'
      });
    }

    if (attempt.is_completed) {
      return res.status(400).json({
        success: false,
        error: 'Quiz already completed'
      });
    }

    // Calculate score
    let score = 0;
    const questions = attempt.quizzes.quiz_questions;
    
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correct_answer) {
        score += question.points;
      }
    });

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    // Update attempt with final results
    const { data: completedAttempt, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        answers,
        score,
        percentage: percentage.toFixed(2),
        time_taken: time_taken || null,
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: completedAttempt
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz'
    });
  }
});

// GET /api/quiz-attempts/stats/summary - Get user's quiz statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('score, percentage, is_completed, completed_at')
      .eq('user_id', req.user.id)
      .eq('is_completed', true);

    if (error) throw error;

    const stats = {
      total_attempts: attempts.length,
      average_score: 0,
      best_score: 0,
      total_time_studied: 0,
      recent_activity: []
    };

    if (attempts.length > 0) {
      stats.average_score = attempts.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / attempts.length;
      stats.best_score = Math.max(...attempts.map(a => parseFloat(a.percentage)));
      
      // Recent activity (last 10 completed attempts)
      stats.recent_activity = attempts
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, 10)
        .map(a => ({
          score: a.score,
          percentage: a.percentage,
          completed_at: a.completed_at
        }));
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz statistics'
    });
  }
});

export default router; 