/** @jest-environment node */
import {
  getBaseUrl,
  getUrlConfig,
  buildUrl,
  buildImageUrl,
  getCanonicalUrl,
  getOgUrl,
  getSiteName,
  getSiteDescription,
  getSiteKeywords,
  getAuthorInfo,
  getOrganizationInfo,
  getWebApplicationInfo,
  isProduction,
  isDevelopment,
  getEnvironmentConfig
} from './url-utils';

describe('url-utils', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  describe('getBaseUrl', () => {
    it('should return NEXT_PUBLIC_SITE_URL if defined on server-side', () => {
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-url.com';
      expect(getBaseUrl()).toBe('https://custom-url.com');

      windowSpy.mockRestore();
    });

    it('should return production URL if on server-side and in production', () => {
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NODE_ENV = 'production';
      expect(getBaseUrl()).toBe('https://options-bookie.mankala.space');

      windowSpy.mockRestore();
    });

    it('should return localhost URL if on server-side and in development', () => {
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NODE_ENV = 'development';
      expect(getBaseUrl()).toBe('http://localhost:3007');

      windowSpy.mockRestore();
    });

    it('should return window.location.origin on client-side', () => {
      // Ensure window is defined
      if (!global.window) {
        // @ts-ignore
        global.window = { location: { origin: 'http://localhost:3000' } };
      }

      const originSpy = jest.spyOn(window.location, 'origin', 'get').mockReturnValue('https://client-url.com');

      expect(getBaseUrl()).toBe('https://client-url.com');

      originSpy.mockRestore();
    });
  });

  describe('getUrlConfig', () => {
    it('should return correct config for https URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      const config = getUrlConfig();
      expect(config).toEqual({
        baseUrl: 'https://example.com',
        domain: 'example.com',
        protocol: 'https:',
        port: '443'
      });

      windowSpy.mockRestore();
    });

    it('should return correct config for http URL with port', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3007';
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      const config = getUrlConfig();
      expect(config).toEqual({
        baseUrl: 'http://localhost:3007',
        domain: 'localhost',
        protocol: 'http:',
        port: '3007'
      });

      windowSpy.mockRestore();
    });
  });

  describe('buildUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      // @ts-ignore - simulating server environment
      jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should append path correctly without leading slash', () => {
      expect(buildUrl('test')).toBe('https://example.com/test');
    });

    it('should append path correctly with leading slash', () => {
      expect(buildUrl('/test')).toBe('https://example.com/test');
    });

    it('should return base URL with / when path is empty', () => {
      expect(buildUrl()).toBe('https://example.com/');
    });
  });

  describe('metadata and info helpers', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      // @ts-ignore - simulating server environment
      jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('buildImageUrl should return full image URL', () => {
      expect(buildImageUrl('/img.png')).toBe('https://example.com/img.png');
    });

    it('getCanonicalUrl should return full canonical URL', () => {
      expect(getCanonicalUrl('/page')).toBe('https://example.com/page');
    });

    it('getOgUrl should return full OG URL', () => {
      expect(getOgUrl('/page')).toBe('https://example.com/page');
    });

    it('getSiteName should return env value or default', () => {
      process.env.NEXT_PUBLIC_SITE_NAME = 'Custom Name';
      expect(getSiteName()).toBe('Custom Name');
      delete process.env.NEXT_PUBLIC_SITE_NAME;
      expect(getSiteName()).toBe('OptionsBookie');
    });

    it('getSiteDescription should return env value or default', () => {
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION = 'Custom Desc';
      expect(getSiteDescription()).toBe('Custom Desc');
      delete process.env.NEXT_PUBLIC_SITE_DESCRIPTION;
      expect(getSiteDescription()).toContain('Professional options trading tracker');
    });

    it('getSiteKeywords should return env values or defaults', () => {
      process.env.NEXT_PUBLIC_SITE_KEYWORDS = 'key1, key2';
      expect(getSiteKeywords()).toEqual(['key1', 'key2']);
      delete process.env.NEXT_PUBLIC_SITE_KEYWORDS;
      expect(getSiteKeywords()).toContain('options trading');
    });

    it('getAuthorInfo should return env values or defaults', () => {
      process.env.NEXT_PUBLIC_AUTHOR_NAME = 'Test Author';
      const info = getAuthorInfo();
      expect(info.name).toBe('Test Author');
      delete process.env.NEXT_PUBLIC_AUTHOR_NAME;
      expect(getAuthorInfo().name).toBe('Manohar Mankala');
    });

    it('getOrganizationInfo should return correct structure', () => {
      const info = getOrganizationInfo();
      expect(info.name).toBe('OptionsBookie');
      expect(info).toHaveProperty('logo');
      expect(info).toHaveProperty('contactPoint');
    });

    it('getWebApplicationInfo should return correct structure', () => {
      const info = getWebApplicationInfo();
      expect(info.name).toBe('OptionsBookie');
      expect(info.applicationCategory).toBe('FinanceApplication');
    });
  });

  describe('environment checks', () => {
    it('isProduction should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('isDevelopment should return true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });

    it('getEnvironmentConfig should return full config', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      // @ts-ignore - simulating server environment
      const windowSpy = jest.spyOn(global, 'window', 'get').mockImplementation(() => undefined as any);

      const config = getEnvironmentConfig();
      expect(config.isProduction).toBe(true);
      expect(config.baseUrl).toBe('https://example.com');

      windowSpy.mockRestore();
    });
  });
});
