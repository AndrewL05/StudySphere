import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Create a function to get user-specific Supabase client
const getUserSupabase = (userToken) => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    }
  );
};

// Also keep the service client for non-user specific operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('Token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('Verifying token with Supabase...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(403).json({ error: 'Invalid token', details: error.message });
    }
    
    if (!user) {
      console.log('No user found for token');
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    console.log('User authenticated:', user.id);
    req.user = user;
    req.userToken = token; // Store the token for RLS operations
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Token verification failed', details: error.message });
  }
};

// GET /api/quizzes/test - Test database connectivity
router.get('/test', async (req, res) => {
  try {
    // Test if quiz tables exist
    const { data: quizTest, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .limit(1);

    const { data: questionsTest, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id')
      .limit(1);

    const { data: attemptsTest, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id')
      .limit(1);

    res.json({
      success: true,
      tables: {
        quizzes: !quizError,
        quiz_questions: !questionsError,
        quiz_attempts: !attemptsError
      },
      errors: {
        quizzes: quizError?.message,
        quiz_questions: questionsError?.message,
        quiz_attempts: attemptsError?.message
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connectivity test failed',
      details: error.message
    });
  }
});

// GET /api/quizzes - Get all quizzes for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        flashcard_sets (
          id,
          title,
          description
        ),
        quiz_attempts (
          id,
          score,
          percentage,
          completed_at,
          is_completed
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quizzes'
    });
  }
});

// GET /api/quizzes/public - Get public quizzes
router.get('/public', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        flashcard_sets (
          id,
          title,
          description
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching public quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public quizzes'
    });
  }
});

// GET /api/quizzes/:id - Get specific quiz
router.get('/:id', async (req, res) => {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        flashcard_sets (
          id,
          title,
          description
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (quizError) throw quizError;

    // Check if user has access (owner or public quiz)
    const hasAccess = quiz.is_public || (req.user && quiz.user_id === req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this quiz'
      });
    }

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', req.params.id)
      .order('order_index');

    if (questionsError) throw questionsError;

    res.json({
      success: true,
      data: {
        ...quiz,
        questions: questions || []
      }
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
});

// POST /api/quizzes - Create new quiz
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Creating quiz with data:', req.body);
    
    const {
      title,
      description,
      flashcard_set_id,
      quiz_type = 'multiple_choice',
      question_count = 10,
      time_limit,
      is_public = false,
      use_ai_generation = false
    } = req.body;

    // Validate required fields
    if (!title || !flashcard_set_id) {
      console.log('Validation failed: missing title or flashcard_set_id');
      return res.status(400).json({
        success: false,
        error: 'Title and flashcard_set_id are required'
      });
    }

    // Get user-specific Supabase client for RLS
    const userSupabase = getUserSupabase(req.userToken);

    console.log('Verifying flashcard set ownership...');
    // Verify user owns the flashcard set
    const { data: flashcardSet, error: setError } = await userSupabase
      .from('flashcard_sets')
      .select('*')
      .eq('id', flashcard_set_id)
      .single();

    if (setError) {
      console.error('Error fetching flashcard set:', setError);
      return res.status(403).json({
        success: false,
        error: 'Flashcard set not found or access denied'
      });
    }

    if (!flashcardSet) {
      console.log('Flashcard set not found for user');
      return res.status(403).json({
        success: false,
        error: 'Flashcard set not found or access denied'
      });
    }

    console.log('Creating quiz in database...');
    // Create quiz with user-specific client
    const { data: quiz, error: quizError } = await userSupabase
      .from('quizzes')
      .insert({
        title,
        description,
        flashcard_set_id,
        user_id: req.user.id,
        quiz_type,
        question_count: parseInt(question_count),
        time_limit: time_limit ? parseInt(time_limit) : null,
        is_public
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating quiz:', quizError);
      throw quizError;
    }

    console.log('Quiz created successfully:', quiz.id);
    console.log('Generating questions with AI:', use_ai_generation);

    // Generate quiz questions
    if (use_ai_generation) {
      // Use AI-powered generation
      console.log('Starting AI question generation...');
      await generateAIQuizQuestions(quiz.id, flashcard_set_id, quiz_type, question_count, req.userToken);
    } else {
      // Use database function for basic generation
      console.log('Using database function for question generation...');
      const { error: generateError } = await userSupabase.rpc('generate_quiz_questions', {
        p_quiz_id: quiz.id,
        p_flashcard_set_id: flashcard_set_id,
        p_question_count: parseInt(question_count),
        p_quiz_type: quiz_type
      });

      if (generateError) {
        console.error('Error generating questions:', generateError);
        throw generateError;
      }
    }

    console.log('Quiz creation completed successfully');
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz',
      details: error.message
    });
  }
});

// PUT /api/quizzes/:id - Update quiz
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      quiz_type,
      question_count,
      time_limit,
      is_public
    } = req.body;

    const { data, error } = await supabase
      .from('quizzes')
      .update({
        title,
        description,
        quiz_type,
        question_count: question_count ? parseInt(question_count) : undefined,
        time_limit: time_limit ? parseInt(time_limit) : null,
        is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or access denied'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quiz'
    });
  }
});

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz'
    });
  }
});

// POST /api/quizzes/:id/regenerate - Regenerate quiz questions
router.post('/:id/regenerate', authenticateToken, async (req, res) => {
  try {
    const { use_ai_generation = false } = req.body;

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or access denied'
      });
    }

    // Regenerate questions
    if (use_ai_generation) {
      await generateAIQuizQuestions(quiz.id, quiz.flashcard_set_id, quiz.quiz_type, quiz.question_count, req.userToken);
    } else {
      const { error: generateError } = await supabase.rpc('generate_quiz_questions', {
        p_quiz_id: quiz.id,
        p_flashcard_set_id: quiz.flashcard_set_id,
        p_question_count: quiz.question_count,
        p_quiz_type: quiz.quiz_type
      });

      if (generateError) throw generateError;
    }

    res.json({
      success: true,
      message: 'Quiz questions regenerated successfully'
    });
  } catch (error) {
    console.error('Error regenerating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate quiz questions'
    });
  }
});

// AI-powered quiz generation function
async function generateAIQuizQuestions(quizId, flashcardSetId, quizType, questionCount, userToken) {
  try {
    // Get user-specific Supabase client
    const userSupabase = getUserSupabase(userToken);
    
    // Get flashcards from the set
    const { data: flashcards, error: flashcardsError } = await userSupabase
      .from('flashcards')
      .select('*')
      .eq('set_id', flashcardSetId);

    if (flashcardsError) throw flashcardsError;

    if (!flashcards || flashcards.length < 3) {
      throw new Error('Not enough flashcards to generate quiz');
    }

    // Clear existing questions
    await userSupabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    // Use OpenAI or other AI service to generate intelligent questions
    const aiQuestions = await generateIntelligentQuestions(flashcards, quizType, questionCount, userToken);

    // Insert AI-generated questions
    const { error: insertError } = await userSupabase
      .from('quiz_questions')
      .insert(aiQuestions.map((question, index) => ({
        quiz_id: quizId,
        flashcard_id: question.flashcard_id,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        wrong_answers: question.wrong_answers,
        question_type: quizType,
        points: 1,
        order_index: index + 1
      })));

    if (insertError) throw insertError;

    return aiQuestions.length;
  } catch (error) {
    console.error('Error in AI quiz generation:', error);
    throw error;
  }
}

// AI question generation using OpenRouter
async function generateIntelligentQuestions(flashcards, quizType, questionCount, userToken) {
  try {
    // If no OpenRouter API key, fall back to basic generation
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('No OpenRouter API key found, falling back to basic generation');
      return generateBasicQuestions(flashcards, quizType, questionCount);
    }

    const selectedCards = flashcards
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(questionCount, flashcards.length));

    const questions = [];

    for (const card of selectedCards) {
      try {
        const aiQuestion = await generateAIQuestionForCard(card, flashcards, quizType, userToken);
        questions.push(aiQuestion);
      } catch (error) {
        console.error('Error generating AI question for card:', card.id, error);
        // Fall back to basic generation for this card
        const basicQuestion = generateBasicQuestionForCard(card, flashcards, quizType);
        questions.push(basicQuestion);
      }
    }

    return questions;
  } catch (error) {
    console.error('Error in AI question generation:', error);
    // Fall back to basic generation
    return generateBasicQuestions(flashcards, quizType, questionCount);
  }
}

// Generate AI question for a single card using OpenRouter
async function generateAIQuestionForCard(targetCard, allCards, quizType, userToken) {
  const axios = (await import('axios')).default;
  
  // Create context from all flashcards
  const context = allCards.map(card => `${card.term}: ${card.definition}`).join('\n');
  
  let prompt = '';
  
  switch (quizType) {
    case 'multiple_choice':
      prompt = `Based on the following flashcard context, create an intelligent multiple choice question for the term "${targetCard.term}".
      
Context:
${context}

Requirements:
- Create a challenging question that tests understanding, not just memorization
- Generate 3 plausible but incorrect distractors (wrong answers)
- The question can be variations like "What does ${targetCard.term} mean?", "Which definition best describes ${targetCard.term}?", or conceptual applications
- Make distractors realistic and related to the subject matter
- Ensure only one answer is clearly correct

Response format (JSON):
{
  "question": "Your intelligent question here",
  "correct_answer": "${targetCard.definition}",
  "wrong_answers": ["distractor1", "distractor2", "distractor3"]
}`;
      break;

    case 'true_false':
      prompt = `Based on the following flashcard context, create an intelligent true/false question for the term "${targetCard.term}".

Context:
${context}

Requirements:
- Create a challenging statement that tests understanding
- The statement should be definitively true or false
- For false statements, make subtle but clear errors
- Vary between testing the term-definition relationship and conceptual understanding

Response format (JSON):
{
  "question": "Your true/false statement here",
  "correct_answer": "True" or "False",
  "wrong_answers": ["False"] or ["True"]
}`;
      break;

    case 'fill_blank':
      prompt = `Based on the following flashcard context, create an intelligent fill-in-the-blank question for the term "${targetCard.term}".

Context:
${context}

Requirements:
- Create a question that tests understanding of the definition
- Use contexts like "Complete the definition:", "Fill in the missing part:", or scenario-based questions
- Make the blank meaningful and test key concepts

Response format (JSON):
{
  "question": "Your fill-in-the-blank question with ___ for the blank",
  "correct_answer": "${targetCard.definition}",
  "wrong_answers": []
}`;
      break;

    default:
      throw new Error(`Unsupported quiz type: ${quizType}`);
  }

  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'mistralai/mistral-7b-instruct:free',
    messages: [
      {
        role: 'system',
        content: 'You are an educational AI that creates high-quality quiz questions. You MUST respond with ONLY valid JSON in the exact format requested. Do not include any explanations, markdown formatting, or additional text.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 800
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studysphere.app',
      'X-Title': 'StudySphere Quiz Generator'
    }
  });

  const aiResponse = response.data.choices[0].message.content;
  
  console.log('Raw AI response:', aiResponse);
  console.log('AI response length:', aiResponse?.length || 0);
  
  // Check for empty response
  if (!aiResponse || aiResponse.trim().length === 0) {
    console.error('AI returned empty response');
    throw new Error('AI returned empty response');
  }
  
  // Parse JSON response
  let parsedResponse;
  try {
    // Clean up the response more thoroughly
    let cleanResponse = aiResponse.trim();
    
    // Remove markdown formatting
    cleanResponse = cleanResponse.replace(/```json\n?|\n?```/g, '');
    
    // Remove any leading/trailing text that isn't JSON
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    console.log('Cleaned response:', cleanResponse);
    parsedResponse = JSON.parse(cleanResponse);
  } catch (parseError) {
    console.error('Failed to parse AI response:', aiResponse);
    console.error('Parse error:', parseError.message);
    throw new Error('Invalid AI response format');
  }

  // Validate response structure
  if (!parsedResponse.question || !parsedResponse.correct_answer) {
    throw new Error('Invalid AI response structure');
  }

  return {
    flashcard_id: targetCard.id,
    question_text: parsedResponse.question,
    correct_answer: parsedResponse.correct_answer,
    wrong_answers: parsedResponse.wrong_answers || []
  };
}

// Basic question generation fallback
function generateBasicQuestions(flashcards, quizType, questionCount) {
  const selectedCards = flashcards
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(questionCount, flashcards.length));

  return selectedCards.map(card => generateBasicQuestionForCard(card, flashcards, quizType));
}

function generateBasicQuestionForCard(card, allCards, quizType) {
  let questionText, correctAnswer, wrongAnswers = [];

  switch (quizType) {
    case 'multiple_choice':
      questionText = `What is the definition of "${card.term}"?`;
      correctAnswer = card.definition;
      wrongAnswers = allCards
        .filter(f => f.id !== card.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(f => f.definition);
      break;

    case 'true_false':
      questionText = `True or False: "${card.term}" means "${card.definition}"`;
      correctAnswer = 'True';
      wrongAnswers = ['False'];
      break;

    case 'fill_blank':
      questionText = `Complete the definition: "${card.term}" means ___`;
      correctAnswer = card.definition;
      wrongAnswers = [];
      break;

    default:
      questionText = `What is the definition of "${card.term}"?`;
      correctAnswer = card.definition;
      wrongAnswers = [];
  }

  return {
    flashcard_id: card.id,
    question_text: questionText,
    correct_answer: correctAnswer,
    wrong_answers: wrongAnswers
  };
}

export default router; 