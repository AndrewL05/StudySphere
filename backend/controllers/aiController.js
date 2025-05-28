import { getOpenRouterChatResponse, generateContentFromOpenRouter } from '../services/openRouterService.js'; 

export const handleAIChat = async (req, res, next) => {
  try {
    const userId = req.user?.id; 
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated for AI chat.' });
    }

    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // might want to add more validation or context based on the user
    const aiResponse = await getOpenRouterChatResponse(prompt, history);
    res.json(aiResponse);

  } catch (error) {
    console.error('Error in AI chat handler:', error);
    // Pass error to the global error handler, or handle more specifically
    next(error); 
  }
};

export const handleAIGenerate = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated for content generation.' });
    }

    const { content, type, numItems, difficulty } = req.body;
    if (!content || !type) {
      return res.status(400).json({ error: 'Content and type are required.' });
    }

    const generatedData = await generateContentFromOpenRouter(content, type, numItems, difficulty, userId);
    res.json(generatedData);

  } catch (error) {
    console.error('Error in AI generate handler:', error);
    next(error);
  }
};
