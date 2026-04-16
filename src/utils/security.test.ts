import { safeJsonLdStringify } from './security';

describe('safeJsonLdStringify', () => {
  it('should stringify a simple object', () => {
    const data = { name: 'Test' };
    expect(safeJsonLdStringify(data)).toBe('{"name":"Test"}');
  });

  it('should escape dangerous characters to Unicode equivalents', () => {
    const data = {
      html: '<script>alert(1)</script>',
      more: 'A & B > C',
      path: '/api/test'
    };
    const result = safeJsonLdStringify(data);

    // Check that characters are escaped
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('&');
    expect(result).not.toContain('</');

    // Check Unicode escapes
    expect(result).toContain('\\u003c');
    expect(result).toContain('\\u003e');
    expect(result).toContain('\\u0026');
    expect(result).toContain('\\u002f');

    // Ensure it's still valid JSON when parsed
    expect(JSON.parse(result)).toEqual(data);
  });

  it('should handle null and undefined by returning empty string', () => {
    expect(safeJsonLdStringify(null)).toBe('');
    expect(safeJsonLdStringify(undefined)).toBe('');
  });

  it('should handle non-object inputs by returning empty string', () => {
    expect(safeJsonLdStringify('string')).toBe('');
    expect(safeJsonLdStringify(123)).toBe('');
    expect(safeJsonLdStringify(true)).toBe('');
  });

  it('should handle complex nested objects', () => {
    const data = {
      user: {
        bio: 'I like <b>tags</b> & "quotes"',
      },
      tags: ['<a href="/test">Link</a>']
    };
    const result = safeJsonLdStringify(data);

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('&');
    expect(result).not.toContain('/');
    expect(JSON.parse(result)).toEqual(data);
  });

  it('should escape line separators', () => {
    const data = {
      text: 'Line 1\u2028Line 2\u2029End'
    };
    const result = safeJsonLdStringify(data);
    expect(result).toContain('\\u2028');
    expect(result).toContain('\\u2029');
    expect(JSON.parse(result)).toEqual(data);
  });
});
