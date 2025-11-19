import { logger } from '../utils/logger';
import database from '../database/connection';

interface GeoRestrictions {
  type: 'whitelist' | 'blacklist';
  countries?: string[]; // ISO 3166-1 alpha-2 codes
  regions?: string[];
  message?: string;
}

interface GeoLocation {
  country: string; // ISO alpha-2 code
  region?: string;
  city?: string;
  ip: string;
}

/**
 * GeoBlockingService - Handle geographic content restrictions
 *
 * Supports:
 * - Country-level blocking/allowing
 * - Region-level restrictions
 * - IP-based geolocation
 * - Custom restriction messages
 */
export class GeoBlockingService {
  // Map of region codes to countries for easier management
  private readonly REGION_GROUPS = {
    EU: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
    LATAM: ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'UY', 'VE'],
    NORTH_AMERICA: ['US', 'CA', 'MX'],
    ASIA: ['CN', 'JP', 'KR', 'IN', 'ID', 'TH', 'VN', 'PH', 'MY', 'SG'],
    MIDDLE_EAST: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'TR', 'IQ', 'IR'],
  };

  /**
   * Check if content is accessible from a given location
   *
   * @param restrictions - Geo restrictions for the content
   * @param location - User's geographic location
   * @returns Object with access status and message
   */
  public isAccessible(
    restrictions: GeoRestrictions | null,
    location: GeoLocation
  ): { allowed: boolean; message?: string } {
    // No restrictions means accessible everywhere
    if (!restrictions) {
      return { allowed: true };
    }

    const { type, countries = [], regions = [], message } = restrictions;

    // Expand region groups to country codes
    const expandedCountries = this.expandRegionGroups(countries);

    // Check country-level restrictions
    const countryMatch = expandedCountries.includes(location.country);

    let allowed: boolean;

    if (type === 'whitelist') {
      // Whitelist: only allow if country is in the list
      allowed = countryMatch;
    } else {
      // Blacklist: block if country is in the list
      allowed = !countryMatch;
    }

    if (!allowed) {
      return {
        allowed: false,
        message: message || this.getDefaultBlockMessage(location.country),
      };
    }

    // Check region-level restrictions if specified
    if (regions.length > 0 && location.region) {
      const regionMatch = regions.includes(location.region);

      if (type === 'whitelist') {
        allowed = regionMatch;
      } else {
        allowed = !regionMatch;
      }

      if (!allowed) {
        return {
          allowed: false,
          message: message || this.getDefaultBlockMessage(location.country, location.region),
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get geolocation from IP address
   * In production, use a service like MaxMind GeoIP2 or ipapi.co
   *
   * @param ip - IP address
   * @returns Geographic location
   */
  public async getLocationFromIP(ip: string): Promise<GeoLocation> {
    try {
      // For development/testing, return mock data
      if (process.env.NODE_ENV === 'development' || ip === '127.0.0.1' || ip === 'localhost') {
        return {
          country: 'US',
          region: 'California',
          city: 'San Francisco',
          ip,
        };
      }

      // In production, integrate with a geolocation service
      // Example with ipapi.co (requires API key):
      /*
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();

      return {
        country: data.country_code,
        region: data.region,
        city: data.city,
        ip,
      };
      */

      // For now, return a default location
      logger.warn(`Geolocation service not configured, using default for IP: ${ip}`);
      return {
        country: 'US',
        region: undefined,
        city: undefined,
        ip,
      };
    } catch (error: any) {
      logger.error('Error getting geolocation:', error);
      throw new Error(`Failed to get geolocation for IP ${ip}`);
    }
  }

  /**
   * Validate geo restrictions format
   */
  public validateRestrictions(restrictions: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!restrictions) {
      return { valid: true, errors: [] };
    }

    // Validate type
    if (!restrictions.type || !['whitelist', 'blacklist'].includes(restrictions.type)) {
      errors.push('Type must be either "whitelist" or "blacklist"');
    }

    // Validate countries array
    if (restrictions.countries && !Array.isArray(restrictions.countries)) {
      errors.push('Countries must be an array');
    }

    // Validate country codes (should be ISO 3166-1 alpha-2)
    if (restrictions.countries) {
      const invalidCountries = restrictions.countries.filter(
        (code: string) => typeof code !== 'string' || code.length !== 2
      );
      if (invalidCountries.length > 0) {
        errors.push(`Invalid country codes: ${invalidCountries.join(', ')}`);
      }
    }

    // Validate regions array
    if (restrictions.regions && !Array.isArray(restrictions.regions)) {
      errors.push('Regions must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Expand region groups to individual country codes
   */
  private expandRegionGroups(countries: string[]): string[] {
    const expanded: string[] = [];

    for (const code of countries) {
      const upperCode = code.toUpperCase();

      // Check if it's a region group
      if (this.REGION_GROUPS[upperCode as keyof typeof this.REGION_GROUPS]) {
        expanded.push(...this.REGION_GROUPS[upperCode as keyof typeof this.REGION_GROUPS]);
      } else {
        expanded.push(upperCode);
      }
    }

    return [...new Set(expanded)]; // Remove duplicates
  }

  /**
   * Get default block message
   */
  private getDefaultBlockMessage(country: string, region?: string): string {
    if (region) {
      return `This content is not available in ${region}, ${country}`;
    }
    return `This content is not available in ${this.getCountryName(country)}`;
  }

  /**
   * Get country name from code
   */
  private getCountryName(code: string): string {
    const countries: Record<string, string> = {
      US: 'United States',
      MX: 'Mexico',
      CA: 'Canada',
      GB: 'United Kingdom',
      DE: 'Germany',
      FR: 'France',
      ES: 'Spain',
      IT: 'Italy',
      BR: 'Brazil',
      AR: 'Argentina',
      JP: 'Japan',
      CN: 'China',
      IN: 'India',
      AU: 'Australia',
      // Add more as needed
    };

    return countries[code] || code;
  }

  /**
   * Log access attempt for analytics
   */
  public async logAccessAttempt(
    postId: string,
    location: GeoLocation,
    allowed: boolean
  ): Promise<void> {
    try {
      await database.query(
        `INSERT INTO video_analytics
         (post_id, platform, country_code, views, timestamp)
         VALUES ($1, 'web', $2, $3, NOW())`,
        [postId, location.country, allowed ? 1 : 0]
      );
    } catch (error) {
      logger.error('Error logging access attempt:', error);
    }
  }

  /**
   * Get access statistics by region
   */
  public async getAccessStatsByRegion(postId: string): Promise<any[]> {
    try {
      const result = await database.query(
        `SELECT
          country_code,
          COUNT(*) as total_attempts,
          SUM(views) as successful_views,
          COUNT(*) - SUM(views) as blocked_attempts
         FROM video_analytics
         WHERE post_id = $1
         GROUP BY country_code
         ORDER BY total_attempts DESC`,
        [postId]
      );

      return result.rows.map(row => ({
        country: row.country_code,
        countryName: this.getCountryName(row.country_code),
        totalAttempts: parseInt(row.total_attempts),
        successfulViews: parseInt(row.successful_views),
        blockedAttempts: parseInt(row.blocked_attempts),
      }));
    } catch (error: any) {
      logger.error('Error getting access stats:', error);
      throw error;
    }
  }

  /**
   * Get suggested restrictions based on analytics
   */
  public async getSuggestedRestrictions(userId: string): Promise<any> {
    try {
      const result = await database.query(
        `SELECT
          va.country_code,
          COUNT(*) as view_count,
          AVG(va.engagement_rate) as avg_engagement
         FROM video_analytics va
         JOIN posts p ON va.post_id = p.id
         WHERE p.user_id = $1
         GROUP BY va.country_code
         ORDER BY view_count DESC
         LIMIT 10`,
        [userId]
      );

      return {
        topCountries: result.rows.map(row => ({
          country: row.country_code,
          countryName: this.getCountryName(row.country_code),
          views: parseInt(row.view_count),
          avgEngagement: parseFloat(row.avg_engagement || 0),
        })),
        suggestion: {
          type: 'whitelist',
          countries: result.rows.slice(0, 5).map(r => r.country_code),
          message: 'Based on your top-performing regions',
        },
      };
    } catch (error: any) {
      logger.error('Error getting suggested restrictions:', error);
      throw error;
    }
  }
}

export const geoBlockingService = new GeoBlockingService();
