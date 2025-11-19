import { Router } from 'express';
import authRoutes from './auth';
import postRoutes from './posts';
import platformRoutes from './platforms';
import aiRoutes from './ai';
import platformAccountRoutes from './platformAccounts';
import oauthRoutes from './oauth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/platforms', platformRoutes);
router.use('/ai', aiRoutes);
router.use('/platform-accounts', platformAccountRoutes);
router.use('/oauth', oauthRoutes);

export default router;
