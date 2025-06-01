import express from 'express';
import aiRoutes from './aiRoutes.js';
import userRoutes from './userRoutes.js';
import quizRoutes from './quizzes.js';
import quizAttemptRoutes from './quiz-attempts.js';

const router = express.Router();

router.use('/ai', aiRoutes);

router.use('/users', userRoutes);

router.use('/quizzes', quizRoutes);

router.use('/quiz-attempts', quizAttemptRoutes);

export default router;
