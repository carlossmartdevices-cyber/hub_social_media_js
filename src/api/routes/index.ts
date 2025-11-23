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

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/platforms', platformRoutes);
router.use('/ai', aiRoutes);
router.use('/platform-accounts', platformAccountRoutes);
router.use('/oauth', oauthRoutes);
router.use('/video', videoRoutes);
router.use('/english-learning', englishLearningRoutes);
router.use('/telegram', telegramRoutes);

export default router;
