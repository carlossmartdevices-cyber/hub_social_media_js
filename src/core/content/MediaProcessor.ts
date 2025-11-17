import sharp from 'sharp';
import { MediaFile, MediaType, Platform } from './types';
import { PlatformFactory } from '../../platforms';
import { logger } from '../../utils/logger';

export class MediaProcessor {
  /**
   * Optimizes image for a specific platform
   */
  static async optimizeImage(
    buffer: Buffer,
    platform: Platform
  ): Promise<{ buffer: Buffer; metadata: any }> {
    const adapter = PlatformFactory.createAdapter(platform);
    const requirements = adapter.getRequirements();

    let image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if needed
    if (requirements.maxImageDimensions) {
      const { width, height } = requirements.maxImageDimensions;
      if (
        (metadata.width && metadata.width > width) ||
        (metadata.height && metadata.height > height)
      ) {
        image = image.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
        logger.info(`Image resized for ${platform}: ${metadata.width}x${metadata.height} -> ${width}x${height}`);
      }
    }

    // Compress if needed
    const processedBuffer = await image.jpeg({ quality: 85 }).toBuffer();

    if (processedBuffer.length > requirements.maxImageSize) {
      // Further compression needed
      const quality = Math.floor((requirements.maxImageSize / processedBuffer.length) * 85);
      const compressedBuffer = await sharp(buffer)
        .jpeg({ quality: Math.max(quality, 60) })
        .toBuffer();

      logger.info(
        `Image compressed for ${platform}: ${buffer.length} -> ${compressedBuffer.length} bytes`
      );

      return {
        buffer: compressedBuffer,
        metadata: await sharp(compressedBuffer).metadata(),
      };
    }

    return {
      buffer: processedBuffer,
      metadata: await sharp(processedBuffer).metadata(),
    };
  }

  /**
   * Validates media file
   */
  static async validateMedia(media: MediaFile, platform: Platform): Promise<boolean> {
    const adapter = PlatformFactory.createAdapter(platform);
    const requirements = adapter.getRequirements();

    if (!requirements.supportedMediaTypes.includes(media.mimeType)) {
      logger.error(`Media type ${media.mimeType} not supported for ${platform}`);
      return false;
    }

    if (media.type === MediaType.IMAGE && media.size > requirements.maxImageSize) {
      logger.error(`Image size ${media.size} exceeds limit for ${platform}`);
      return false;
    }

    if (media.type === MediaType.VIDEO && media.size > requirements.maxVideoSize) {
      logger.error(`Video size ${media.size} exceeds limit for ${platform}`);
      return false;
    }

    return true;
  }

  /**
   * Gets media type from MIME type
   */
  static getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) {
      if (mimeType === 'image/gif') return MediaType.GIF;
      return MediaType.IMAGE;
    }
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }

  /**
   * Creates thumbnail from video (placeholder)
   */
  static async createVideoThumbnail(_videoBuffer: Buffer): Promise<Buffer> {
    // This would use ffmpeg to extract a frame
    // For now, return a placeholder
    logger.warn('Video thumbnail generation not implemented');
    return Buffer.from('');
  }
}

export default MediaProcessor;
