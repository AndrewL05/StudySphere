import express from 'express';
import aiRoutes from './aiRoutes.js';
import userRoutes from './userRoutes.js';

const router = express.Router();

router.use('/ai', aiRoutes);

router.use('/users', userRoutes);

export default router;
