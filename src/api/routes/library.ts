import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { contentLibraryController } from '../controllers/ContentLibraryController';

const router = Router();

// All library routes require authentication
router.use(authMiddleware);

/**
 * Generate content with AI and save to library
 * POST /api/library/generate
 * Body: { prompt: string, title?: string, mediaUrl?: string, mediaType?: string }
 */
router.post('/generate', contentLibraryController.generateAndSave);

/**
 * Get all content from library
 * GET /api/library?status=draft&limit=50&offset=0
 */
router.get('/', contentLibraryController.getAll);

/**
 * Get single content item
 * GET /api/library/:id
 */
router.get('/:id', contentLibraryController.getOne);

/**
 * Update content in library
 * PUT /api/library/:id
 * Body: { title?, content_en?, content_es?, hashtags_en?, hashtags_es?, status? }
 */
router.put('/:id', contentLibraryController.update);

/**
 * Delete content from library
 * DELETE /api/library/:id
 */
router.delete('/:id', contentLibraryController.delete);

/**
 * Post content to a platform (immediately or scheduled)
 * POST /api/library/:id/post
 * Body: { platform: string, language?: 'en'|'es', scheduledAt?: string }
 */
router.post('/:id/post', contentLibraryController.postToPlatform);

/**
 * Regenerate content for an existing library item
 * POST /api/library/:id/regenerate
 */
router.post('/:id/regenerate', contentLibraryController.regenerate);

export default router;
