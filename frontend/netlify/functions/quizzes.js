import { createClient } from '@supabase/supabase-js';

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

// Service client for non-user specific operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// AI question generation using OpenRouter
async function generateAIQuestionForCard(targetCard, allCards, quizType) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

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

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studysphere.app',
      'X-Title': 'StudySphere Quiz Generator'
    },
    body: JSON.stringify({
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
    })
  });

  const aiResponse = await response.json();
  const content = aiResponse.choices[0].message.content;
  
  if (!content || content.trim().length === 0) {
    throw new Error('AI returned empty response');
  }
  
  // Clean and parse JSON response
  let cleanResponse = content.trim();
  cleanResponse = cleanResponse.replace(/```json\n?|\n?```/g, '');
  
  const jsonStart = cleanResponse.indexOf('{');
  const jsonEnd = cleanResponse.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
  }
  
  const parsedResponse = JSON.parse(cleanResponse);

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

export const handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path, body: rawBody, headers: requestHeaders } = event;
    
    // Parse authorization header
    const authHeader = requestHeaders.authorization || requestHeaders.Authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token required' })
      };
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Handle POST /quizzes
    if (httpMethod === 'POST') {
      const body = JSON.parse(rawBody);
      const {
        title,
        description,
        flashcard_set_id,
        quiz_type = 'multiple_choice',
        question_count = 10,
        time_limit,
        is_public = false,
        use_ai_generation = false
      } = body;

      if (!title || !flashcard_set_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Title and flashcard_set_id are required' })
        };
      }

      const userSupabase = getUserSupabase(token);

      // Verify user owns the flashcard set
      const { data: flashcardSet, error: setError } = await userSupabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', flashcard_set_id)
        .single();

      if (setError || !flashcardSet) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Flashcard set not found or access denied' })
        };
      }

      // Create quiz
      const { data: quiz, error: quizError } = await userSupabase
        .from('quizzes')
        .insert({
          title,
          description,
          flashcard_set_id,
          user_id: user.id,
          quiz_type,
          question_count: parseInt(question_count),
          time_limit: time_limit ? parseInt(time_limit) : null,
          is_public
        })
        .select()
        .single();

      if (quizError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create quiz' })
        };
      }

      // Get flashcards for question generation
      const { data: flashcards, error: flashcardsError } = await userSupabase
        .from('flashcards')
        .select('*')
        .eq('set_id', flashcard_set_id);

      if (flashcardsError || !flashcards || flashcards.length < 3) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Not enough flashcards to generate quiz' })
        };
      }

      // Generate questions
      const selectedCards = flashcards
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(question_count, flashcards.length));

      const questions = [];

      for (const card of selectedCards) {
        try {
          if (use_ai_generation && process.env.OPENROUTER_API_KEY) {
            const aiQuestion = await generateAIQuestionForCard(card, flashcards, quiz_type);
            questions.push(aiQuestion);
          } else {
            const basicQuestion = generateBasicQuestionForCard(card, flashcards, quiz_type);
            questions.push(basicQuestion);
          }
        } catch (error) {
          console.error('Error generating question for card:', card.id, error);
          const basicQuestion = generateBasicQuestionForCard(card, flashcards, quiz_type);
          questions.push(basicQuestion);
        }
      }

      // Insert questions
      const { error: insertError } = await userSupabase
        .from('quiz_questions')
        .insert(questions.map((question, index) => ({
          quiz_id: quiz.id,
          flashcard_id: question.flashcard_id,
          question_text: question.question_text,
          correct_answer: question.correct_answer,
          wrong_answers: question.wrong_answers,
          question_type: quiz_type,
          points: 1,
          order_index: index + 1
        })));

      if (insertError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create quiz questions' })
        };
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: quiz
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 