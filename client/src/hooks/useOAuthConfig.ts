import { useState, useEffect } from 'react';
import axios from 'axios';

export interface OAuth2Platform {
  id: string;
  name: string;
  oauth2Available: boolean;
  oauth2Scopes?: string[];
  authorizationEndpoint?: string;
}

interface OAuth2ConfigResponse {
  success: boolean;
  platforms: OAuth2Platform[];
}

const CACHE_KEY = 'oauth2_config';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * React hook to fetch and cache OAuth 2.0 configuration
 * Automatically fetches configuration on component mount
 * Implements client-side caching with 5-minute TTL
 *
 * @returns Object containing platforms list, loading state, error, and helper functions
 */
export function useOAuthConfig() {
  const [platforms, setPlatforms] = useState<OAuth2Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOAuthConfig();
  }, []);

  const fetchOAuthConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setPlatforms(data);
            setLoading(false);
            return;
          }
        } catch (parseError) {
          // Invalid cache, continue with fetch
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Fetch from API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const response = await axios.get<OAuth2ConfigResponse>(`${apiUrl}/oauth/config`);

      if (response.data.success) {
        const platformData = response.data.platforms;
        setPlatforms(platformData);

        // Cache the result
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: platformData,
              timestamp: Date.now(),
            })
          );
        } catch (cacheError) {
          // localStorage may be full or disabled, continue without caching
          console.warn('Failed to cache OAuth config:', cacheError);
        }
      } else {
        setError('Failed to load OAuth configuration');
        setPlatforms([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch OAuth config:', err);
      setError(err.message || 'Failed to fetch OAuth configuration');
      // Fallback to empty array on error
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if OAuth 2.0 is available for a specific platform
   * @param platformId - The platform ID to check
   * @returns true if OAuth 2.0 is available and configured
   */
  const isOAuthAvailable = (platformId: string): boolean => {
    return platforms.some((p) => p.id === platformId && p.oauth2Available);
  };

  /**
   * Get OAuth 2.0 configuration for a specific platform
   * @param platformId - The platform ID to get config for
   * @returns OAuth2Platform config or null if not found
   */
  const getPlatformConfig = (platformId: string): OAuth2Platform | null => {
    return platforms.find((p) => p.id === platformId) || null;
  };

  /**
   * Clear the cached OAuth configuration
   * Useful for forcing a refresh of the configuration
   */
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (err) {
      console.warn('Failed to clear OAuth cache:', err);
    }
  };

  return {
    platforms,
    loading,
    error,
    isOAuthAvailable,
    getPlatformConfig,
    refetch: fetchOAuthConfig,
    clearCache,
  };
}
