import express from 'express';
import { handleAIChat, handleAIGenerate } from '../controllers/aiController.js';
import { protectRoute } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/chat', protectRoute, handleAIChat);

router.post('/generate', protectRoute, handleAIGenerate);

export default router;
