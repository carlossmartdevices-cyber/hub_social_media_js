import { Router } from 'express';
import authRoutes from './auth';
import postRoutes from './posts';
import platformRoutes from './platforms';
import aiRoutes from './ai';
import platformAccountRoutes from './platformAccounts';
import oauthRoutes from './oauth';
import videoRoutes from './video';
import englishLearningRoutes from './englishLearning';
import telegramRoutes from './telegram';
import automatedActionsRoutes from './automatedActions';
import webhookRoutes from './webhook';

const router = Router();

// Health check endpoint
router.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/platforms', platformRoutes);
router.use('/ai', aiRoutes);
router.use('/platform-accounts', platformAccountRoutes);
router.use('/oauth', oauthRoutes);
router.use('/video', videoRoutes);
router.use('/english-learning', englishLearningRoutes);
router.use('/telegram', telegramRoutes);
router.use('/automated-actions', automatedActionsRoutes);
router.use('/webhook', webhookRoutes);

export default router;
