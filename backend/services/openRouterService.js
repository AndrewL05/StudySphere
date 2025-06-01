import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

const getApiKey = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("key:", apiKey);
    console.warn("WARNING: OPENROUTER_API_KEY is not set. AI features will not work.");
    throw new Error("OpenRouter API key is not configured.");
  }
  return apiKey;
};

export const getOpenRouterChatResponse = async (prompt, history = [], model = "deepseek/deepseek-r1:free") => {
  const OPENROUTER_API_KEY = getApiKey();

  try {
    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: model,
        messages: [
          ...history, 
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data; 
  } catch (error) {
    console.error('Error calling OpenRouter chat API:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get response from AI service.');
  }
};

export const generateContentFromOpenRouter = async (content, type, numItems = 5, difficulty = "medium", userId) => {
  const OPENROUTER_API_KEY = getApiKey();

  let systemPrompt = "";
  let userPrompt = "";

  if (type === 'quiz') {
    systemPrompt = `You are an AI assistant that generates educational quizzes. Generate ${numItems} multiple-choice questions of ${difficulty} difficulty based on the provided text. Each question should have 4 options, and you must indicate the correct answer. Respond ONLY in JSON format like this: {"questions": [{"questionText": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}]}`;
    userPrompt = `Generate a quiz from the following text:\n\n${content}`;
  } else if (type === 'flashcard') {
    systemPrompt = `You are an AI assistant that generates educational flashcards. Generate ${numItems} flashcards (term and definition) based on the provided text. Respond ONLY in JSON format like this: {"flashcards": [{"term": "...", "definition": "..."}]}`;
    userPrompt = `Generate flashcards from the following text:\n\n${content}`;
  } else {
    throw new Error("Unsupported generation type.");
  }

  try {
    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: "deepseek/deepseek-r1",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" } 
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    let aiContent = response.data.choices[0].message.content;
    try {
        return JSON.parse(aiContent);
    } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.error("Raw AI response content:", aiContent);
        throw new Error("AI service returned an invalid JSON format.");
    }
  } catch (error) {
    console.error(`Error calling OpenRouter for ${type} generation:`, error.response ? error.response.data : error.message);
    throw new Error(`Failed to generate ${type} from AI service.`);
  }
};