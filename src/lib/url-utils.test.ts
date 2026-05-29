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
    // @ts-ignore
    delete global.window;
  });

  afterAll(() => {
    process.env = originalEnv;
    // @ts-ignore
    global.window = originalWindow;
  });

  describe('getBaseUrl', () => {
    it('returns NEXT_PUBLIC_SITE_URL when defined on server-side', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://test-site.com';
      expect(getBaseUrl()).toBe('https://test-site.com');
    });

    it('returns production default when NEXT_PUBLIC_SITE_URL is missing and NODE_ENV is production', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(getBaseUrl()).toBe('https://options-bookie.mankala.space');
    });

    it('returns development default when NEXT_PUBLIC_SITE_URL is missing and NODE_ENV is not production', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(getBaseUrl()).toBe('http://localhost:3007');
    });

    it('returns window.location.origin on client-side', () => {
      global.window = {
        location: {
          origin: 'https://client-side.com'
        }
      } as any;
      expect(getBaseUrl()).toBe('https://client-side.com');
    });
  });

  describe('getUrlConfig', () => {
    it('returns correct config for https', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      const config = getUrlConfig();
      expect(config).toEqual({
        baseUrl: 'https://example.com',
        domain: 'example.com',
        protocol: 'https:',
        port: '443'
      });
    });

    it('returns correct config for http', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3007';
      const config = getUrlConfig();
      expect(config).toEqual({
        baseUrl: 'http://localhost:3007',
        domain: 'localhost',
        protocol: 'http:',
        port: '3007'
      });
    });

    it('returns port 80 for http without explicit port', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://example.com';
      const config = getUrlConfig();
      expect(config.port).toBe('80');
    });
  });

  describe('URL building functions', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://base.com';
    });

    it('buildUrl appends path correctly', () => {
      expect(buildUrl('test')).toBe('https://base.com/test');
      expect(buildUrl('/test')).toBe('https://base.com/test');
      expect(buildUrl('')).toBe('https://base.com/');
    });

    it('buildImageUrl works', () => {
      expect(buildImageUrl('/images/logo.png')).toBe('https://base.com/images/logo.png');
    });

    it('getCanonicalUrl works', () => {
      expect(getCanonicalUrl('/page')).toBe('https://base.com/page');
      expect(getCanonicalUrl()).toBe('https://base.com/');
    });

    it('getOgUrl works', () => {
      expect(getOgUrl('/og')).toBe('https://base.com/og');
    });
  });

  describe('Site Metadata', () => {
    it('getSiteName returns env var or default', () => {
      process.env.NEXT_PUBLIC_SITE_NAME = 'Custom Name';
      expect(getSiteName()).toBe('Custom Name');
      delete process.env.NEXT_PUBLIC_SITE_NAME;
      expect(getSiteName()).toBe('OptionsBookie');
    });

    it('getSiteDescription returns env var or default', () => {
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION = 'Custom Desc';
      expect(getSiteDescription()).toBe('Custom Desc');
      delete process.env.NEXT_PUBLIC_SITE_DESCRIPTION;
      expect(getSiteDescription()).toContain('Professional options trading tracker');
    });

    it('getSiteKeywords returns env var or default', () => {
      process.env.NEXT_PUBLIC_SITE_KEYWORDS = 'key1, key2';
      expect(getSiteKeywords()).toEqual(['key1', 'key2']);
      delete process.env.NEXT_PUBLIC_SITE_KEYWORDS;
      const keywords = getSiteKeywords();
      expect(keywords).toHaveLength(12);
      expect(keywords).toContain('options trading');
    });
  });

  describe('Author & Info', () => {
    it('getAuthorInfo returns env var or defaults', () => {
      process.env.NEXT_PUBLIC_AUTHOR_NAME = 'John Doe';
      process.env.NEXT_PUBLIC_AUTHOR_URL = 'https://john.com';
      process.env.NEXT_PUBLIC_AUTHOR_EMAIL = 'john@doe.com';

      expect(getAuthorInfo()).toEqual({
        name: 'John Doe',
        url: 'https://john.com',
        email: 'john@doe.com'
      });

      delete process.env.NEXT_PUBLIC_AUTHOR_NAME;
      delete process.env.NEXT_PUBLIC_AUTHOR_URL;
      delete process.env.NEXT_PUBLIC_AUTHOR_EMAIL;

      expect(getAuthorInfo()).toEqual({
        name: 'Manohar Mankala',
        url: 'https://mankala.space',
        email: 'manohar.mankala@gmail.com'
      });
    });

    it('getOrganizationInfo returns structured object', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.com';
      const org = getOrganizationInfo();
      expect(org).toMatchObject({
        name: 'OptionsBookie',
        url: 'https://site.com',
        logo: 'https://site.com/images/OptionBookie1.png',
        foundingDate: '2024'
      });
      expect(org.founder).toBeDefined();
      expect(org.contactPoint).toBeDefined();
    });

    it('getWebApplicationInfo returns structured object', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.com';
      const app = getWebApplicationInfo();
      expect(app).toMatchObject({
        name: 'OptionsBookie',
        url: 'https://site.com',
        applicationCategory: 'FinanceApplication',
        softwareVersion: '1.0.0'
      });
      expect(app.featureList).toBeInstanceOf(Array);
      expect(app.author).toEqual({
        name: 'OptionsBookie',
        url: 'https://site.com'
      });
    });
  });

  describe('Environment Helpers', () => {
    it('isProduction works', () => {
      (process.env as any).NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      (process.env as any).NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('isDevelopment works', () => {
      (process.env as any).NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      (process.env as any).NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });

    it('getEnvironmentConfig aggregates info', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://prod.com';
      const config = getEnvironmentConfig();
      expect(config).toEqual({
        isProduction: true,
        isDevelopment: false,
        baseUrl: 'https://prod.com',
        domain: 'prod.com',
        protocol: 'https:'
      });
    });
  });
});
